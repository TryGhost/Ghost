/* globals window */

// isFinite function from lodash

export default function (value) {
    return window.isFinite(value) && !window.isNaN(parseFloat(value));
}
