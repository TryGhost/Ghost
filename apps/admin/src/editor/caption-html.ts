/**
 * Feature image caption HTML helpers (ported from Ember's
 * gh-editor-feature-image.js caption handling).
 */

function hasParagraphWrapper(html: string): boolean {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body?.firstElementChild?.tagName === "P";
}

/** Wrap a stored caption in a paragraph so Lexical parses it (Ember `get caption`). */
export function wrapCaption(content: string | null): string | null {
    if (!content) {
        return null;
    }
    return hasParagraphWrapper(content) ? content : `<p>${content}</p>`;
}

function isLexicalPlainTextSpan(element: HTMLElement): boolean {
    // Ember checks `style.length === 1 && style.whiteSpace === 'pre-wrap'`;
    // matching the raw attribute keeps the intent ("the only style is
    // white-space: pre-wrap") while staying correct in browsers where
    // `white-space` expands to multiple longhand properties
    const style = element.getAttribute("style") ?? "";
    return element.tagName === "SPAN" && /^\s*white-space:\s*pre-wrap;?\s*$/i.test(style);
}

/**
 * Stored captions are unwrapped paragraph content; Lexical additionally wraps
 * plain text in `white-space: pre-wrap` spans on load. Normalize both away so
 * an API-loaded caption doesn't mark the post dirty (Ember's
 * cleanCaptionHtml + normalizeCaptionHtml).
 */
export function cleanCaptionHtml(html: string | null): string {
    const doc = new DOMParser().parseFromString(html ?? "", "text/html");

    doc.body.querySelectorAll("span").forEach((element) => {
        if (isLexicalPlainTextSpan(element)) {
            element.replaceWith(...element.childNodes);
        }
    });

    const root = doc.body.firstElementChild?.tagName === "P" && doc.body.children.length === 1
        ? (doc.body.firstElementChild as HTMLElement)
        : doc.body;
    return root.innerHTML.trim();
}
