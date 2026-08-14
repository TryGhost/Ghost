/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/generate-excerpt.js @ 407e032dc7 —
// transforms: imports→seam, inline require('downsize-cjs') hoisted to a top-level import.
import downsize from 'downsize-cjs';

function generateExcerpt(excerpt: string, truncateOptions?: any) {
    truncateOptions = truncateOptions || {};

    if (!truncateOptions.words && !truncateOptions.characters) {
        truncateOptions.words = 50;
    }

    // Just uses downsize to truncate, not format
    return downsize(excerpt, truncateOptions);
}

export default generateExcerpt;
