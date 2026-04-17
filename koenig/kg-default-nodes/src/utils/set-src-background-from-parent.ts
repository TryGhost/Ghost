/**
 * Builds an inline script tag that reads `data-src` from the first iframe
 * in the script's parent element, detects the nearest non-transparent ancestor
 * background color, appends it as a `background` query param, and sets `src`
 * to trigger a single load with the correct background.
 *
 * Uses `document.currentScript` to scope to the containing card, so multiple
 * instances on the same page each target their own iframe.
 *
 * @param {Document} document
 * @returns {HTMLScriptElement} A script element
 */
export function buildSrcBackgroundScript(document) {
    function setSrcBackgroundFromParent() {
        const script = document.currentScript;
        if (!script) {
            return;
        }

        const el = script.parentElement.querySelector('iframe[data-src]');
        if (!el) {
            return;
        }

        const baseSrc = el.getAttribute('data-src');

        function colorToRgb(color) {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
            return {r, g, b, a};
        }

        let node = el.parentElement;
        let bg;
        while (node) {
            bg = window.getComputedStyle(node).backgroundColor;
            if (bg && bg !== 'transparent') {
                const {a} = colorToRgb(bg);
                if (a > 0) {
                    break;
                }
            }
            node = node.parentElement;
        }

        if (!node || !bg || bg === 'transparent') {
            el.src = baseSrc;
            return;
        }

        const {r, g, b, a} = colorToRgb(bg);
        if (a === 0) {
            el.src = baseSrc;
            return;
        }

        const hex = [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
        const u = new URL(baseSrc);
        u.searchParams.set('background', hex);
        el.src = u.toString();
    }

    const script = document.createElement('script');
    script.innerHTML = `(${setSrcBackgroundFromParent.toString()})()`;
    return script;
}
