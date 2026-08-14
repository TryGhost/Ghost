import errors from '@tryghost/errors';
import type {RendererDeps} from './types.ts';

/**
 * Module-level dependency holder.
 *
 * Ghost's own frontend reaches its dependencies through singleton requires
 * (services/proxy.js). To keep the copied helper bodies byte-identical, the
 * package mirrors that shape: one process-wide deps object, configured before
 * render. Per-render context is an accepted later cleanup (spec scope guard:
 * "single render at a time is fine initially").
 */

let deps: RendererDeps | null = null;

export function configureRendererDeps(next: RendererDeps): void {
    deps = next;
}

export function resetRendererDeps(): void {
    deps = null;
}

export function getRendererDeps(): RendererDeps {
    if (!deps) {
        throw new errors.IncorrectUsageError({
            message: '@tryghost/theme-renderer: renderer deps have not been configured — call configureRendererDeps() before rendering'
        });
    }
    return deps;
}
