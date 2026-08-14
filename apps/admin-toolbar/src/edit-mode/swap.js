/**
 * In-place document swap for edit-mode preview: replaces the live page's
 * <head> and <body> with worker-rendered HTML — same URL, no iframe — while
 * PRESERVING a set of live nodes (the toolbar host, the admin auth iframe,
 * and the edit-mode overlay root) by physically moving them into the
 * swapped-in body. The original head/body elements are kept detached and put
 * back on restore(), so their subtree state (listeners, form values, script
 * side-effects in the DOM) survives an edit session.
 *
 * Theme JS re-init (the spec-accepted slice-4 risk) is resolved by NOT
 * executing scripts in the swapped-in DOM at all: the HTML goes through
 * DOMParser, and the HTML spec marks parser-created <script> elements from a
 * DOMParser document "already started" — inserting them never executes them.
 * The preview is therefore markup + CSS only (no theme JS, no portal/search
 * boot inside edit mode); the original page's already-running scripts keep
 * their window/document listeners, which mostly go inert because their DOM
 * references point at the detached original body. Documented trade-off, not
 * an accident.
 *
 * Scroll position is carried across every swap and across restore.
 */

/** @returns {Array<{name: string, value: string}>} */
function snapshotAttributes(element) {
    return Array.from(element.attributes).map(attribute => ({
        name: attribute.name,
        value: attribute.value
    }));
}

function applyAttributes(element, attributes) {
    for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
    }

    for (const {name, value} of attributes) {
        element.setAttribute(name, value);
    }
}

/**
 * @param {Object} options
 * @param {Document} [options.doc]
 * @param {Window} [options.win]
 * @param {string[]} options.preserveSelectors — nodes that must survive every
 *   swap AND the restore (queried against the current document each time)
 */
export function createDocumentSwapper({doc = document, win = window, preserveSelectors}) {
    let original = null; // {head, body, htmlAttributes}

    function collectPreserved() {
        const seen = new Set();
        const nodes = [];

        for (const selector of preserveSelectors) {
            for (const node of doc.querySelectorAll(selector)) {
                if (!seen.has(node)) {
                    seen.add(node);
                    nodes.push(node);
                }
            }
        }

        return nodes;
    }

    function swap(html) {
        const scrollX = win.scrollX;
        const scrollY = win.scrollY;
        const parsed = new win.DOMParser().parseFromString(html, 'text/html');
        const preserved = collectPreserved();

        if (!original) {
            original = {
                head: doc.head,
                body: doc.body,
                htmlAttributes: snapshotAttributes(doc.documentElement)
            };
        }

        const newHead = doc.adoptNode(parsed.head);
        const newBody = doc.adoptNode(parsed.body);

        for (const node of preserved) {
            newBody.appendChild(node);
        }

        doc.documentElement.replaceChild(newHead, doc.head);
        doc.documentElement.replaceChild(newBody, doc.body);
        applyAttributes(doc.documentElement, snapshotAttributes(parsed.documentElement));

        win.scrollTo(scrollX, scrollY);
    }

    function restore() {
        if (!original) {
            return;
        }

        const scrollX = win.scrollX;
        const scrollY = win.scrollY;
        const preserved = collectPreserved();

        for (const node of preserved) {
            original.body.appendChild(node);
        }

        doc.documentElement.replaceChild(original.head, doc.head);
        doc.documentElement.replaceChild(original.body, doc.body);
        applyAttributes(doc.documentElement, original.htmlAttributes);

        original = null;
        win.scrollTo(scrollX, scrollY);
    }

    return {
        swap,
        restore,
        hasSwapped() {
            return original !== null;
        }
    };
}
