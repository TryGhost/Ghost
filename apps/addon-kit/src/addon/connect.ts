import { GhostMutationMirror } from './mutation-mirror.ts';
import type { RemoteConnection } from '@remote-dom/core/elements';

/** Registers the single remote-DOM mirror hook used by every provider bundle. */
export function registerGhostConnectionHook(): void {
  (globalThis as Record<string, unknown>).__ghostAddonConnect = (
    connection: RemoteConnection,
    root: Node,
  ) => {
    const mirror = new GhostMutationMirror(connection);
    mirror.observe(root);
    return mirror;
  };
}
