/**
 * Portable-shell activation: the native Windows toast click reaches the page as
 * a `#dsh-session=<id>&n=<nonce>` hash. This module parses that contract and
 * owns the one-at-a-time controller that waits for the session list to become
 * authoritative, checks the optional archived set, asks the workspace service
 * to open the session, and clears the hash. Browser capabilities are injected,
 * so the whole state machine runs in Node tests without a DOM.
 */

/** How long a shell hand-off may wait for the session list before it is dropped. */
export const ACTIVATION_TIMEOUT_MS = 20_000

/** The session id budget from the portable-shell contract. */
const MAX_SESSION_ID_LENGTH = 200

/** The id charset from the contract: DSH ids may carry agent prefixes and dots. */
const SESSION_ID_PATTERN = /^[A-Za-z0-9._-]+$/

/** One hash hand-off from the shell. */
export interface ActivationRequest {
  readonly sessionId: string
  /** Shell nonce; empty when an older shell omitted it. */
  readonly nonce: string
}

/**
 * Decode an activation hash.
 * @param hash - `#dsh-session=<id>&n=<nonce>`, with or without the leading `#`.
 * @returns the request, or undefined when the hash carries no usable session.
 */
export function parseActivationHash(hash: string): ActivationRequest | undefined {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (raw === '') return undefined
  let params: URLSearchParams
  try {
    params = new URLSearchParams(raw)
  } catch {
    return undefined
  }
  const sessionId = params.get('dsh-session')
  if (sessionId === null || sessionId === '') return undefined
  if (sessionId.length > MAX_SESSION_ID_LENGTH) return undefined
  if (!SESSION_ID_PATTERN.test(sessionId)) return undefined
  // Missing nonce stays legal for older shells; the empty string means "none".
  return { sessionId, nonce: params.get('n') ?? '' }
}

/** The session-list slice the controller needs. */
export interface ActivationListState {
  readonly phase: 'pending' | 'ready'
  readonly ids: readonly string[]
  readonly byId: Readonly<Record<string, unknown>>
}

/** The workspace-list slice the controller needs. */
export interface ActivationWorkspaceState {
  readonly phase: 'pending' | 'ready'
  readonly archivedSessionIds: readonly string[]
}

/** Every browser seam the controller touches. */
export interface ActivationDeps {
  /** Read the current `window.location.hash`. */
  readonly readHash: () => string
  /** Clear the hash while keeping pathname and query. */
  readonly clearHash: () => void
  /** Wake the controller when the session list changes. */
  readonly subscribeList: (listener: () => void) => () => void
  /** Read the live session list snapshot. */
  readonly getList: () => ActivationListState
  /** Read the live workspace list snapshot when that service exists. */
  readonly getWorkspaces?: () => ActivationWorkspaceState | undefined
  /** Wake the controller when the workspace list changes. */
  readonly subscribeWorkspaces?: (listener: () => void) => () => void
  /** Open exactly one known session. */
  readonly openSession: (id: string) => void
  /** Ask the session controller to refresh the host-authoritative list once. */
  readonly refresh?: () => Promise<void>
  /** Clock seam for the deadline and diagnostics. */
  readonly now: () => number
  /** Timer seam for the 20 second deadline. */
  readonly setTimer: (callback: () => void, ms: number) => unknown
  /** Timer seam for cancelling the deadline. */
  readonly clearTimer: (handle: unknown) => void
  /** Diagnostic sink; activation never throws into the page. */
  readonly log: (message: string) => void
}

/** The controller surface the plugin wires to `hashchange`. */
export interface ActivationController {
  /** Accept a hash; duplicate nonces and malformed hashes are ignored. */
  handleHash(hash?: string): void
  /** Evaluate the pending target against the current list/workspace state. */
  flush(): void
  /** Drop the pending target, timers, and subscriptions. */
  dispose(): void
}

interface PendingActivation {
  readonly sessionId: string
  readonly nonce: string
  readonly generation: number
  readonly deadline: number
  requestedRefresh: boolean
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Create the activation controller.
 * @param deps - hash, list, workspace, navigation, clock, and logging seams.
 * @returns the controller; it subscribes immediately and owns the subscription.
 */
export function createActivationController(deps: ActivationDeps): ActivationController {
  let disposed = false
  let phase: 'idle' | 'pending' | 'opening' | 'done' = 'idle'
  let pending: PendingActivation | undefined
  let timer: unknown
  let generation = 0
  // Nonces are unique per shell activation. Keeping every accepted one makes a
  // replayed hashchange harmless even after a newer activation has replaced it.
  const handledNonces = new Set<string>()

  const cancelTimer = (): void => {
    if (timer === undefined) return
    deps.clearTimer(timer)
    timer = undefined
  }

  const discard = (next: 'idle' | 'done'): void => {
    cancelTimer()
    pending = undefined
    phase = next
  }

  const clearHash = (): void => {
    try {
      deps.clearHash()
    } catch (error) {
      deps.log(`[dsh-notification] activation hash cleanup failed: ${messageOf(error)}`)
    }
  }

  const expire = (target: PendingActivation): void => {
    if (disposed || pending !== target || phase !== 'pending') return
    deps.log(`[dsh-notification] activation timed out after ${ACTIVATION_TIMEOUT_MS}ms for session ${target.sessionId}`)
    clearHash()
    discard('done')
  }

  const flush = (): void => {
    const target = pending
    if (disposed || phase !== 'pending' || target === undefined) return
    if (deps.now() >= target.deadline) {
      expire(target)
      return
    }

    let list: ActivationListState
    try {
      list = deps.getList()
    } catch (error) {
      deps.log(`[dsh-notification] activation could not read the session list: ${messageOf(error)}`)
      return
    }
    if (list.phase !== 'ready') return

    const listed = list.ids.includes(target.sessionId) || list.byId[target.sessionId] !== undefined
    if (!listed) {
      // A cold start can list before the host catalog is complete. One refresh
      // is enough; repeating it would hammer the host while the id is unknown.
      if (!target.requestedRefresh && deps.refresh !== undefined) {
        target.requestedRefresh = true
        try {
          deps.refresh().catch((error: unknown) => {
            deps.log(`[dsh-notification] activation refresh failed: ${messageOf(error)}`)
          })
        } catch (error) {
          deps.log(`[dsh-notification] activation refresh failed: ${messageOf(error)}`)
        }
      }
      return
    }

    let workspaces: ActivationWorkspaceState | undefined
    try {
      workspaces = deps.getWorkspaces?.()
    } catch (error) {
      deps.log(`[dsh-notification] activation could not read the workspace list: ${messageOf(error)}`)
      workspaces = undefined
    }
    if (workspaces !== undefined) {
      if (workspaces.phase !== 'ready') return
      if (workspaces.archivedSessionIds.includes(target.sessionId)) {
        deps.log(`[dsh-notification] activation skipped archived session ${target.sessionId}`)
        clearHash()
        discard('done')
        return
      }
    }

    // openSession can synchronously invalidate the list (and re-enter flush).
    // Mark the state before the call so that re-entry cannot open twice.
    if (disposed || pending !== target || phase !== 'pending') return
    phase = 'opening'
    try {
      deps.openSession(target.sessionId)
    } catch (error) {
      deps.log(`[dsh-notification] activation failed to open session ${target.sessionId}: ${messageOf(error)}`)
    }
    // A hash accepted during openSession owns a newer target; keep it pending.
    if (pending !== target) return
    clearHash()
    deps.log(`[dsh-notification] activation opened session ${target.sessionId}`)
    discard('done')
  }

  const handleHash = (hash: string = deps.readHash()): void => {
    if (disposed) return
    const request = parseActivationHash(hash)
    if (request === undefined) return
    // A repeated hashchange for the same shell activation is a no-op.
    if (request.nonce !== '' && handledNonces.has(request.nonce)) return
    if (request.nonce !== '' && pending?.nonce === request.nonce) return

    cancelTimer()
    generation += 1
    if (request.nonce !== '') handledNonces.add(request.nonce)
    const target: PendingActivation = {
      sessionId: request.sessionId,
      nonce: request.nonce,
      generation,
      deadline: deps.now() + ACTIVATION_TIMEOUT_MS,
      requestedRefresh: false,
    }
    pending = target
    phase = 'pending'
    timer = deps.setTimer(() => {
      timer = undefined
      expire(target)
    }, ACTIVATION_TIMEOUT_MS)
    deps.log(`[dsh-notification] activation waiting for session ${target.sessionId}`)
    flush()
  }

  const stopList = deps.subscribeList(flush)
  const stopWorkspaces = deps.getWorkspaces === undefined || deps.subscribeWorkspaces === undefined
    ? undefined
    : deps.subscribeWorkspaces(flush)

  return {
    handleHash,
    flush,
    dispose: () => {
      if (disposed) return
      disposed = true
      cancelTimer()
      pending = undefined
      phase = 'done'
      stopList()
      stopWorkspaces?.()
    },
  }
}
