/* globals window */

// isFinite function from lodash

function isFinite(value) {
    return window.isFinite(value) && !window.isNaN(parseFloat(value));
}

export default isFinite;
