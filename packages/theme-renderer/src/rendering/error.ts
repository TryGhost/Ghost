/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/rendering/error.js @ 407e032dc7 —
// transforms: CJS → ESM; the `next` callback closure → a function mapping the
// error straight to the result union (`next()` → `{next: true}`,
// `next(err)` → `{error: {err}}`).
import type {RenderResult} from '../ports.ts';

/**
 * @description Centralized error handling for API requests.
 * @returns {Object} RenderResult
 */
export default function handleError(err: any): RenderResult {
    // CASE: if we've thrown an error message of type: 'NotFound' then we found no path match, try next router!
    if (err.errorType === 'NotFoundError') {
        return {next: true};
    }

    // CASE: the site should not output validation errors e.g. you ask for /feed.xml/ and it tries to fetch
    //       this post from Content API (by slug), but this is not a valid slug. With dynamic routing we cannot
    //       add a regex to the target express route, because we don't know if people use /:slug/ or not. It's dynamic.
    if (err.errorType === 'ValidationError') {
        // @NOTE: Just try next router, it will end in a 404 if no router can resolve the request.
        return {next: true};
    }

    return {error: {err}};
}
