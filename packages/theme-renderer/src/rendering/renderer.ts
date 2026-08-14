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
// table (ghost/core oracle: express@4.22.2 → send@0.19.2 → mime@1.6.0); this
// carries only the entries plausible as routes.yaml content_type values —
// each verified against mime 1.6.0's table (incl. rss → application/rss+xml).
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
    html: 'text/html',
    txt: 'text/plain',
    text: 'text/plain',
    json: 'application/json',
    xml: 'application/xml',
    rss: 'application/rss+xml',
    md: 'text/markdown'
};

// mime v1 Mime.prototype.lookup falls back to default_type for unknown
// extensions
const MIME_DEFAULT_TYPE = 'application/octet-stream';

// express/lib/response.js `charsetRegExp` — detects an existing charset param
// (deliberately case-sensitive, exactly as upstream)
const CHARSET_PRESENT = /;\s*charset\s*=/;

// mime v1 charsets.lookup "Assume text types are utf8" rule — deliberately
// UNanchored (application/json-patch+json matches) and case-sensitive
// (TEXT/HTML does not), exactly as upstream
const UTF8_TYPES = /^text\/|^application\/(javascript|json)/;

/**
 * Express `res.type()` semantics (response.js `contentType` + `set`), matched
 * to the ghost/core oracle byte for byte — see the RES_TYPE_ORACLE table in
 * test/rendering/pipeline.test.ts.
 */
function toContentTypeHeader(type: string): string {
    let resolved = type;
    if (!type.includes('/')) {
        // mime v1 lookup: strip through the last '.'/'/'/'\\' and lowercase
        // (the '/' arm is unreachable here — res.type only calls lookup for
        // values without one)
        const ext = type.replace(/^.*[./\\]/, '').toLowerCase();
        resolved = EXTENSION_CONTENT_TYPES[ext] ?? MIME_DEFAULT_TYPE;
    }
    if (CHARSET_PRESENT.test(resolved)) {
        return resolved;
    }
    // charset is looked up against the bare type — before any ';' parameters
    if (UTF8_TYPES.test(resolved.split(';')[0]!)) {
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
