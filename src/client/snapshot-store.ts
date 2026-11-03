/**
 * Snapshot-store surface. The browser module table shares the harness's
 * `@deepseek-ai/dsh-client-store` instance, so the plugin imports it directly
 * instead of keeping a private fallback to the removed client-runtime package.
 */
export { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
export type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
