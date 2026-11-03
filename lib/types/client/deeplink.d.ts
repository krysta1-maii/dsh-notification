/**
 * Portable-shell activation: the native Windows toast click reaches the page as
 * a `#dsh-session=<id>&n=<nonce>` hash. This module parses that contract and
 * owns the one-at-a-time controller that waits for the session list to become
 * authoritative, checks the optional archived set, asks the workspace service
 * to open the session, and clears the hash. Browser capabilities are injected,
 * so the whole state machine runs in Node tests without a DOM.
 */
/** How long a shell hand-off may wait for the session list before it is dropped. */
export declare const ACTIVATION_TIMEOUT_MS = 20000;
/** One hash hand-off from the shell. */
export interface ActivationRequest {
    readonly sessionId: string;
    /** Shell nonce; empty when an older shell omitted it. */
    readonly nonce: string;
}
/**
 * Decode an activation hash.
 * @param hash - `#dsh-session=<id>&n=<nonce>`, with or without the leading `#`.
 * @returns the request, or undefined when the hash carries no usable session.
 */
export declare function parseActivationHash(hash: string): ActivationRequest | undefined;
/** The session-list slice the controller needs. */
export interface ActivationListState {
    readonly phase: 'pending' | 'ready';
    readonly ids: readonly string[];
    readonly byId: Readonly<Record<string, unknown>>;
}
/** The workspace-list slice the controller needs. */
export interface ActivationWorkspaceState {
    readonly phase: 'pending' | 'ready';
    readonly archivedSessionIds: readonly string[];
}
/** Every browser seam the controller touches. */
export interface ActivationDeps {
    /** Read the current `window.location.hash`. */
    readonly readHash: () => string;
    /** Clear the hash while keeping pathname and query. */
    readonly clearHash: () => void;
    /** Wake the controller when the session list changes. */
    readonly subscribeList: (listener: () => void) => () => void;
    /** Read the live session list snapshot. */
    readonly getList: () => ActivationListState;
    /** Read the live workspace list snapshot when that service exists. */
    readonly getWorkspaces?: () => ActivationWorkspaceState | undefined;
    /** Wake the controller when the workspace list changes. */
    readonly subscribeWorkspaces?: (listener: () => void) => () => void;
    /** Open exactly one known session. */
    readonly openSession: (id: string) => void;
    /** Ask the session controller to refresh the host-authoritative list once. */
    readonly refresh?: () => Promise<void>;
    /** Clock seam for the deadline and diagnostics. */
    readonly now: () => number;
    /** Timer seam for the 20 second deadline. */
    readonly setTimer: (callback: () => void, ms: number) => unknown;
    /** Timer seam for cancelling the deadline. */
    readonly clearTimer: (handle: unknown) => void;
    /** Diagnostic sink; activation never throws into the page. */
    readonly log: (message: string) => void;
}
/** The controller surface the plugin wires to `hashchange`. */
export interface ActivationController {
    /** Accept a hash; duplicate nonces and malformed hashes are ignored. */
    handleHash(hash?: string): void;
    /** Evaluate the pending target against the current list/workspace state. */
    flush(): void;
    /** Drop the pending target, timers, and subscriptions. */
    dispose(): void;
}
/**
 * Create the activation controller.
 * @param deps - hash, list, workspace, navigation, clock, and logging seams.
 * @returns the controller; it subscribes immediately and owns the subscription.
 */
export declare function createActivationController(deps: ActivationDeps): ActivationController;
