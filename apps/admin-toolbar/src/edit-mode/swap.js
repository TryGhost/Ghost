/**
 * In-place document swap for edit-mode preview: replaces the live page's
 * <head> and <body> with worker-rendered HTML — same URL, no iframe — while
 * PRESERVING a set of live nodes (the toolbar host and the edit-mode overlay
 * root) by physically moving them into the swapped-in body. The original
 * head/body elements are kept detached and put back on restore(), so their
 * subtree state (listeners, form values, script side-effects in the DOM)
 * survives an edit session.
 *
 * Iframes must NOT be in `preserveSelectors`: moving an iframe between
 * parents discards its browsing context (the spec re-creates it, i.e. the
 * frame reloads), so "preserving" one this way is a lie. The admin auth
 * iframe is therefore left alone — it stays in the detached original body
 * and comes back (reloading once) on restore, which is fine because the
 * session talks to the Admin API with cookies, not through the frame.
 *
 * Theme JS: the HTML goes through DOMParser, and the HTML spec marks
 * parser-created <script> elements "already started" — inserting them never
 * executes them. A markup+CSS-only preview breaks real themes (Casper keeps
 * its nav at opacity:0 until its dropdown.js tags <body>, portal/search boot
 * from script tags), so after every swap the scripts are RE-CREATED as fresh
 * elements, which the browser does execute, in document order. Two scripts
 * stay inert (marked `data-edit-mode-inert`):
 * - the admin toolbar loader (`[data-ghost-admin-toolbar]`) — the toolbar is
 *   already mounted in a preserved host; booting it again would double-mount
 *   and could tear down the very session doing the swapping;
 * - ghost-stats (`src` ending ghost-stats.min.js) — it fires a page hit per
 *   execution, and a preview re-render must never count as a visit.
 * Re-running per swap means window-level listeners from previous swaps
 * accumulate for the session's lifetime; they reference detached DOM and go
 * inert. Accepted cost — restore() brings back the untouched original page.
 *
 * Scroll position is carried across every swap and across restore.
 */

function isInertScript(script) {
    return script.hasAttribute('data-ghost-admin-toolbar') ||
        /\/ghost-stats\.min\.js(\?|$)/.test(script.getAttribute('src') ?? '');
}

/**
 * Re-creates every executable script of the swapped-in document so the
 * browser runs it (see the header — parser-created scripts never execute).
 * Scripts inside preserved nodes are live UI, not preview markup, and are
 * left alone; inert-listed scripts are marked instead of run.
 */
function reviveScripts(doc, preserved) {
    for (const script of Array.from(doc.querySelectorAll('script'))) {
        if (preserved.some(node => node.contains(script))) {
            continue;
        }
        if (isInertScript(script)) {
            script.setAttribute('data-edit-mode-inert', 'true');
            continue;
        }

        const clone = doc.createElement('script');
        for (const attribute of Array.from(script.attributes)) {
            clone.setAttribute(attribute.name, attribute.value);
        }
        clone.textContent = script.textContent;
        // dynamically-created src scripts default to async=true (any-order
        // execution); themes rely on document order, so preserve it unless
        // the tag opted into async itself
        if (clone.getAttribute('src') && !script.hasAttribute('async')) {
            clone.async = false;
        }
        script.replaceWith(clone);
    }
}

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

        // AFTER the full document is in place, so end-of-body theme scripts
        // see the DOM they expect
        reviveScripts(doc, preserved);

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
