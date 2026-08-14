/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/rendering/render-entries.js @ 407e032dc7 —
// transforms: CJS → ESM; Express req/res → ports; @tryghost/debug → dropped.
import formatResponse from './format-response.ts';
import renderer from './renderer.ts';
import type {PortRequest, PortResponse, RenderResult} from '../ports.ts';

/**
 * @description Helper to handle rendering multiple resources.
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Function}
 */
export default function renderEntries(req: PortRequest, res: PortResponse) {
    return function renderEntriesClosure(result: any): RenderResult {
        // Format data 2
        // Render
        return renderer(req, res, formatResponse.entries(result, false, res.locals));
    };
}
