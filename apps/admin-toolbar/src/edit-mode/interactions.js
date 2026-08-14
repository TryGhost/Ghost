/**
 * Click-to-edit interaction wiring for the swapped-in preview document.
 *
 * Capture-phase delegated listeners on the document:
 * - hover: nearest `[data-edit]` ancestor of the hovered node → onHover(el)
 *   (null when leaving) — drives the outline highlight;
 * - click: nearest `[data-edit]` ancestor → preventDefault (a marked element
 *   inside a link must open the editor, not navigate) → onSelect(el).
 *
 * Events originating in the preserved UI surfaces (the toolbar host, the
 * edit-mode overlay host) are ignored — those nodes
 * live in the swapped document but are not part of the preview. Elements
 * without a `data-edit` ancestor are helper-emitted or punted markup
 * (docs/markers.md) — hovering them clears the highlight, clicking them does
 * nothing (and keeps its default behavior, so plain links still navigate;
 * documented spike behavior).
 */

/**
 * @param {Object} options
 * @param {Document} [options.doc]
 * @param {string[]} options.ignoreSelectors — UI surfaces to leave alone
 * @param {(element: Element|null) => void} options.onHover
 * @param {(element: Element) => void} options.onSelect
 * @returns {{detach(): void}}
 */
export function attachEditInteractions({doc = document, ignoreSelectors, onHover, onSelect}) {
    function findTarget(event) {
        const node = event.target;

        if (!node || typeof node.closest !== 'function') {
            return {ignored: false, element: null};
        }

        for (const selector of ignoreSelectors) {
            if (node.closest(selector)) {
                return {ignored: true, element: null};
            }
        }

        return {ignored: false, element: node.closest('[data-edit]')};
    }

    function handleMouseOver(event) {
        const {ignored, element} = findTarget(event);

        if (!ignored) {
            onHover(element);
        }
    }

    function handleClick(event) {
        const {ignored, element} = findTarget(event);

        if (ignored || !element) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        onSelect(element);
    }

    doc.addEventListener('mouseover', handleMouseOver, true);
    doc.addEventListener('click', handleClick, true);

    return {
        detach() {
            doc.removeEventListener('mouseover', handleMouseOver, true);
            doc.removeEventListener('click', handleClick, true);
        }
    };
}
