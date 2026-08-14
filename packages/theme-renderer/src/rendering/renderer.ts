/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/rendering/renderer.js @ 407e032dc7 —
// transforms: CJS → ESM; `res.render(...)` + `res.send(html)` → a `{render}`
// result value (the assembly executes the template and builds the Response);
// the render-callback error handling (ENOENT → IncorrectUsageError) moved to
// the assembly where the engine actually runs; degraded-render Cache-Control
// capping + X-Ghost-Degraded-Render header dropped (no response header port —
// `res.locals.degradedRender` writes stay harmless).
import setContext from './context.ts';
import templates from './templates.ts';
import type {PortRequest, PortResponse, RenderResult} from '../ports.ts';

/**
 * @description Helper function to finally render the data.
 * @param {Object} req
 * @param {Object} res
 * @param {Object} data
 */
export default function renderer(req: PortRequest, res: PortResponse, data: Record<string, any>): RenderResult {
    // Set response context
    setContext(req, res, data);

    // Set template
    templates.setTemplate(req, res, data);

    let contentType: string | undefined;

    // CASE: You can set the content type of the page in your routes.yaml file
    if (res.routerOptions && res.routerOptions.contentType) {
        if (res.routerOptions.templates!.indexOf(res._template!) !== -1) {
            contentType = res.routerOptions.contentType;
        }
    }

    // Render Call — becomes a result value; the assembly runs the engine
    return {render: {template: res._template!, data, contentType}};
}
