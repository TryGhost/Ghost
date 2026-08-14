/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/rendering/render-entry.js @ 407e032dc7 —
// transforms: CJS → ESM; Express req/res → ports; @tryghost/debug → dropped.
import formatResponse from './format-response.ts';
import renderer from './renderer.ts';
import type {PortRequest, PortResponse, RenderResult} from '../ports.ts';

/**
 * @description Helper to handle rendering a single resource.
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Function}
 */
export default function renderEntry(req: PortRequest, res: PortResponse) {
    return function renderEntryClosure(entry: any): RenderResult {
        // Format data 2 - 1 is in preview/entry
        // Render
        return renderer(req, res, formatResponse.entry(entry, res.routerOptions?.context, res.locals));
    };
}
