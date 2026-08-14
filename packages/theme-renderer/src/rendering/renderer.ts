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

// Express `res.type(type)` resolves extension shorthands through the mime v1
// table; this carries only the entries plausible as routes.yaml content_type
// values. Unknown extensions pass through unchanged (mime v1 would produce
// application/octet-stream — but sending the author's literal value is the
// less surprising failure for a virtual renderer).
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
    html: 'text/html',
    txt: 'text/plain',
    text: 'text/plain',
    json: 'application/json',
    xml: 'application/xml',
    rss: 'application/rss+xml',
    md: 'text/markdown'
};

/**
 * Express `res.type()` semantics (response.js `contentType` + setHeader):
 * non-`/` values go through the mime table, and mime v1 `charsets.lookup`
 * appends `; charset=utf-8` for `text/*` and application/{json,javascript}.
 */
function toContentTypeHeader(type: string): string {
    const resolved = type.includes('/') ? type : (EXTENSION_CONTENT_TYPES[type] ?? type);
    if (resolved.includes('charset')) {
        return resolved;
    }
    if (/^text\/|^application\/(json|javascript)$/.test(resolved)) {
        return `${resolved}; charset=utf-8`;
    }
    return resolved;
}

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
    // (routerOptions.templates defaults to [] upstream — StaticRoutesRouter
    // always sets an array; entry candidates here may omit it)
    if (res.routerOptions && res.routerOptions.contentType) {
        if ((res.routerOptions.templates ?? []).indexOf(res._template!) !== -1) {
            contentType = toContentTypeHeader(res.routerOptions.contentType);
        }
    }

    // Render Call — becomes a result value; the assembly runs the engine
    return {render: {template: res._template!, data, contentType}};
}
