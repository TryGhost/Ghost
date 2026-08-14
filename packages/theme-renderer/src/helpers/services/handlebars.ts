/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/helpers/handlebars.js @ 407e032dc7 —
// transforms: CJS → ESM; the module-level `hbs` engine singleton → an injected
// HelperRegistrar (defined in src/seam/types.ts, adapted to the engine by the
// assembly step); `process.env.NODE_ENV === 'development'` → seam config
// `env` (no `process` in a Web Worker); @tryghost/logging → seam logging.
import errors from '@tryghost/errors';
import {logging} from '../../seam/shared.ts';
import {getRendererDeps} from '../../seam/deps.ts';
import {SafeString} from '../../seam/handlebars-env.ts';
import type {HelperRegistrar} from '../../seam/types.ts';

// Register an async handlebars helper for a given handlebars instance
function asyncHelperWrapper(registrar: HelperRegistrar, name: string, fn: any) {
    registrar.registerAsyncHelper(name, async function returnAsync(this: any, context: any, options: any, cb: any) {
        // Handle the case where we only get context and cb
        if (!cb) {
            cb = options;
            options = undefined;
        }

        try {
            const response = await fn.call(this, context, options);
            cb(response);
        } catch (error) {
            const wrappedErr = errors.utils.isGhostError(error as Error) ? error : new errors.IncorrectUsageError({
                err: error as any,
                context: 'registerAsyncThemeHelper: ' + name,
                errorDetails: {
                    originalError: error
                }
            });

            const response = getRendererDeps().config.get('env') === 'development' ? wrappedErr : '';

            logging.error(wrappedErr);

            cb(new SafeString(response as any));
        }
    });
}

// Register a handlebars helper for themes
export function registerThemeHelper(registrar: HelperRegistrar, name: string, fn: any): void {
    registrar.registerHelper(name, fn);
}

// Register an async handlebars helper for themes
export function registerAsyncThemeHelper(registrar: HelperRegistrar, name: string, fn: any): void {
    asyncHelperWrapper(registrar, name, fn);
}
