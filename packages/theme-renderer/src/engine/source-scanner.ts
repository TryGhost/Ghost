/**
 * Shared HTML-open-tag scanning primitives over handlebars theme sources
 * (slice 3, editor spike — fresh code).
 *
 * Both halves of the editor loop must agree on what counts as a static,
 * markable open tag: the marker transform (src/engine/markers.ts) decides
 * which tags receive `data-edit` attributes, and the text-edit applier
 * (src/editor/text-edit.ts) must only resolve — and re-locate — marker
 * positions to tags the transform would have marked. This module is that
 * single source of truth; neither side keeps its own copy of the primitives.
 *
 * The scanner treats handlebars mustaches as opaque regions and understands
 * hbs comments (incl. `}}` inside `{{!-- --}}`), raw blocks
 * (`{{{{raw}}}}…{{{{/raw}}}}`), HTML comments, doctype/closing tags, quoted
 * attribute values (incl. quoted handlebars arguments inside them), and
 * rawtext/RCDATA element bodies (script/style/textarea/title — a `<` inside
 * them is not a tag).
 *
 * Malformed tags are recoverable: when the tag-end walk runs away to EOF
 * (unbalanced attribute quote, unterminated mustache inside a quote), the tag
 * is yielded with `closed: false` and scanning resumes at the next `<` after
 * the tag's start — one malformed tag never costs the rest of the file.
 */

/**
 * Elements whose content the HTML parser treats as raw text (or, for title,
 * RCDATA) — a `<` inside them is not a tag, so the scanner must not report
 * tags there (a marker inside an inline script would corrupt the page), and
 * the editor must not treat their content as editable text.
 */
export const RAWTEXT_TAGS: ReadonlySet<string> = new Set(['script', 'style', 'textarea', 'title']);

/**
 * Returns the index just past the mustache starting at `from`
 * (`source[from..from+1] === '{{'`). Handles `{{!-- --}}` comments (which may
 * contain `}}`), `{{{{raw}}}}…{{{{/raw}}}}` blocks (skipped whole — their
 * content is emitted verbatim but marking it is punted), triple-staches and
 * ordinary mustaches/`{{!}}` comments.
 */
export function mustacheEnd(source: string, from: number): number {
    if (source.startsWith('{{!--', from)) {
        const close = source.indexOf('--}}', from + 5);
        return close === -1 ? source.length : close + 4;
    }
    if (source.startsWith('{{{{', from)) {
        const openClose = source.indexOf('}}}}', from + 4);
        if (openClose === -1) {
            return source.length;
        }
        const name = /^\{\{\{\{\s*([^\s}(]+)/.exec(source.slice(from, openClose + 4))?.[1];
        if (name) {
            const closeTag = `{{{{/${name}}}}}`;
            const closeIdx = source.indexOf(closeTag, openClose + 4);
            if (closeIdx !== -1) {
                return closeIdx + closeTag.length;
            }
        }
        return openClose + 4;
    }
    if (source.startsWith('{{{', from)) {
        const close = source.indexOf('}}}', from + 3);
        return close === -1 ? source.length : close + 3;
    }
    // `{{! comment }}` and every ordinary mustache end at the first '}}'
    const close = source.indexOf('}}', from + 2);
    return close === -1 ? source.length : close + 2;
}

export interface OpenTagName {
    /** The static tag name right after the `<` */
    tagName: string;
    /** Offset just past the tag name */
    nameEnd: number;
    /**
     * True when the character after the name is `/`, `>`, whitespace or EOF —
     * i.e. the tag name is fully static and the marker transform can stamp an
     * attribute after it. Dynamic tag names (`<h{{level}}>`) are not markable:
     * an inserted attribute would land between the static prefix and the
     * mustache and merge with its output.
     */
    markable: boolean;
}

/**
 * The static open tag starting at `offset` (which must point at a `<`), or
 * null when the position is not an element open tag (text, closing tag,
 * doctype, comment, …).
 */
export function openTagNameAt(source: string, offset: number): OpenTagName | null {
    if (source[offset] !== '<') {
        return null;
    }
    const nameMatch = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(source.slice(offset + 1, offset + 64));
    if (!nameMatch) {
        return null;
    }
    const tagName = nameMatch[0];
    const nameEnd = offset + 1 + tagName.length;
    const afterName = source[nameEnd];
    const markable = afterName === undefined || afterName === '/' || afterName === '>' || /\s/.test(afterName);
    return {tagName, nameEnd, markable};
}

export interface OpenTagEnd {
    /** Offset of the closing `>` when closed; `source.length` otherwise */
    end: number;
    /** False when the walk reached EOF without finding the tag's `>` */
    closed: boolean;
    selfClosing: boolean;
}

/**
 * Finds the end of the open tag whose name ends at `nameEnd` — quote-aware
 * and mustache-aware, so a `>` inside an attribute value or a handlebars
 * argument never terminates the tag early. When the walk runs away to EOF
 * (unbalanced quote, unterminated mustache) the result is `closed: false`;
 * callers recover rather than abandoning the rest of the source.
 */
export function openTagEnd(source: string, nameEnd: number): OpenTagEnd {
    const len = source.length;
    let j = nameEnd;
    while (j < len) {
        const c = source[j];
        if (c === '{' && source.startsWith('{{', j)) {
            j = mustacheEnd(source, j);
            continue;
        }
        if (c === '"' || c === '\'') {
            j += 1;
            while (j < len && source[j] !== c) {
                j = source.startsWith('{{', j) ? mustacheEnd(source, j) : j + 1;
            }
            if (j >= len) {
                break; // unbalanced quote — ran away to EOF
            }
            j += 1; // past the closing quote
            continue;
        }
        if (c === '>') {
            return {end: j, closed: true, selfClosing: source[j - 1] === '/'};
        }
        j += 1;
    }
    return {end: len, closed: false, selfClosing: false};
}

/**
 * Index of `</tagName` (case-insensitive) at or after `from`, where the close
 * tag name is followed by `>`, `/`, whitespace or EOF — or -1. Compares
 * bounded slices of the ORIGINAL source case-insensitively instead of
 * searching a lowercased copy: `"İ".toLowerCase()` is two characters, so a
 * full lowercase copy has shifted offsets that would misalign every position
 * after it.
 */
function rawtextCloseIndex(source: string, tagNameLower: string, from: number): number {
    const needle = `</${tagNameLower}`;
    for (let i = source.indexOf('<', from); i !== -1; i = source.indexOf('<', i + 1)) {
        if (source[i + 1] !== '/') {
            continue;
        }
        if (source.slice(i, i + needle.length).toLowerCase() !== needle) {
            continue;
        }
        const following = source[i + needle.length];
        if (following === undefined || following === '>' || following === '/' || /\s/.test(following)) {
            return i;
        }
    }
    return -1;
}

export interface ScannedTag {
    /** Offset of the tag's `<` */
    start: number;
    /** 1-based line of the `<` */
    line: number;
    /** 1-based column of the `<` */
    column: number;
    tagName: string;
    /** Offset just past the tag name */
    nameEnd: number;
    /** See {@link OpenTagName.markable} */
    markable: boolean;
    /** Offset of the closing `>` (`source.length` when `closed` is false) */
    end: number;
    /** False for malformed tags whose end walk ran away to EOF */
    closed: boolean;
    selfClosing: boolean;
}

/**
 * Yields every static HTML open tag in a handlebars source, in order, with
 * 1-based line/column of its `<`. Tags inside mustaches, hbs comments, raw
 * blocks, HTML comments and rawtext element bodies are never yielded — this
 * is the shared definition of "a tag the marker transform can see".
 */
export function* scanSourceTags(source: string): Generator<ScannedTag, void, undefined> {
    const len = source.length;
    let i = 0;
    let line = 1;
    let column = 1;

    const advanceTo = (target: number): void => {
        const stop = Math.min(target, len);
        while (i < stop) {
            if (source.charCodeAt(i) === 10 /* \n */) {
                line += 1;
                column = 1;
            } else {
                column += 1;
            }
            i += 1;
        }
    };

    while (i < len) {
        const ch = source[i];

        if (ch === '{' && source.startsWith('{{', i)) {
            advanceTo(mustacheEnd(source, i));
            continue;
        }
        if (ch !== '<') {
            advanceTo(i + 1);
            continue;
        }
        if (source.startsWith('<!--', i)) {
            const close = source.indexOf('-->', i + 4);
            advanceTo(close === -1 ? len : close + 3);
            continue;
        }
        const next = source[i + 1];
        if (next === '/' || next === '!' || next === '?') {
            // closing tag, doctype/declaration, processing instruction
            const close = source.indexOf('>', i + 1);
            advanceTo(close === -1 ? len : close + 1);
            continue;
        }
        const name = openTagNameAt(source, i);
        if (!name) {
            // literal '<' in text content
            advanceTo(i + 1);
            continue;
        }

        const tagEnd = openTagEnd(source, name.nameEnd);
        yield {
            start: i,
            line,
            column,
            tagName: name.tagName,
            nameEnd: name.nameEnd,
            markable: name.markable,
            ...tagEnd
        };

        if (!tagEnd.closed) {
            // malformed tag — recover at the next '<' after its start instead
            // of abandoning the rest of the source
            const nextTag = source.indexOf('<', i + 1);
            advanceTo(nextTag === -1 ? len : nextTag);
            continue;
        }
        advanceTo(tagEnd.end + 1);

        const lowerName = name.tagName.toLowerCase();
        if (!tagEnd.selfClosing && RAWTEXT_TAGS.has(lowerName)) {
            // skip the element's raw text up to its matching close tag
            const closeIdx = rawtextCloseIndex(source, lowerName, i);
            advanceTo(closeIdx === -1 ? len : closeIdx);
        }
    }
}
