/**
 * Source-location marker injection (slice 3, editor spike — fresh code).
 *
 * `injectEditMarkers(source, filename)` is a source→source transform run
 * BEFORE handlebars.compile — the engine's onCompile hook applies it per
 * template/partial/layout, driven by the resolver filename the engine threads
 * through compile (spec design principle #3). Every static HTML open tag gets
 * stamped with `data-edit="<file>:<line>:<column>"`, where file is the
 * theme-relative resolver path (e.g. 'partials/post-card.hbs') and
 * line/column are the 1-based position of the tag's `<` in the ORIGINAL
 * source, so an editor can seek a click straight to the theme-source
 * location. Insertions never add or remove lines, and positions are computed
 * against the untransformed source, so markers stay true even though the
 * compiled source differs.
 *
 * The scanner is a lightweight HTML-open-tag pass that treats handlebars
 * mustaches as opaque regions (chosen over a hbs.parse AST walk: the AST's
 * ContentStatement values are whitespace-stripped/unescaped copies, while a
 * raw scan keeps original positions exact and handles tags whose attribute
 * lists span mustache boundaries — `<html lang="{{@site.locale}}"{{#match
 * …}}…{{/match}}>` — for free, because the marker lands right after the tag
 * name, always inside a single static chunk).
 *
 * Deliberate punts (documented in docs/markers.md): helper-emitted HTML,
 * dynamic tag names, raw-block ({{{{raw}}}}) content, and rawtext element
 * content (script/style/textarea/title) are never marked.
 */

/** The attribute name stamped onto marked elements. */
export const EDIT_MARKER_ATTRIBUTE = 'data-edit';

export interface EditMarker {
    /** Theme-relative source file, e.g. 'partials/post-card.hbs' */
    file: string;
    /** 1-based line of the open tag's `<` in the original source */
    line: number;
    /** 1-based column of the open tag's `<` in the original source */
    column: number;
}

/** Parses a data-edit attribute value back into its source location. */
export function parseEditMarker(value: string): EditMarker | null {
    const match = /^(.*):(\d+):(\d+)$/.exec(value);
    if (!match) {
        return null;
    }
    return {file: match[1]!, line: Number(match[2]), column: Number(match[3])};
}

/**
 * Elements whose content the HTML parser treats as raw text (or, for title,
 * RCDATA) — a `<` inside them is not a tag, so the scanner must not mark
 * there (a marker inside an inline script would corrupt the page).
 */
const RAWTEXT_TAGS = new Set(['script', 'style', 'textarea', 'title']);

/** data-edit already present in the tag (theme-authored) — never double-mark. */
const EXISTING_MARKER = /\bdata-edit\s*=/;

function escapeAttributeValue(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

interface Insertion {
    offset: number;
    text: string;
}

/**
 * Returns the index just past the mustache starting at `from`
 * (`source[from..from+1] === '{{'`). Handles `{{!-- --}}` comments (which may
 * contain `}}`), `{{{{raw}}}}…{{{{/raw}}}}` blocks (skipped whole — their
 * content is emitted verbatim but marking it is punted), triple-staches and
 * ordinary mustaches/`{{!}}` comments.
 */
function mustacheEnd(source: string, from: number): number {
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

/**
 * Stamps every static HTML open tag in a handlebars source with a
 * `data-edit="<filename>:<line>:<column>"` marker attribute, inserted
 * immediately after the tag name. Returns the source unchanged when there is
 * nothing to mark.
 */
export function injectEditMarkers(source: string, filename: string): string {
    const insertions: Insertion[] = [];
    const lower = source.toLowerCase();
    const len = source.length;
    const file = escapeAttributeValue(filename);

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
        const nameMatch = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(source.slice(i + 1, i + 64));
        if (!nameMatch) {
            // literal '<' in text content
            advanceTo(i + 1);
            continue;
        }
        const tagName = nameMatch[0];
        const nameEnd = i + 1 + tagName.length;
        const afterName = source[nameEnd];
        // dynamic tag names (`<h{{level}}>`) are punted — an inserted
        // attribute would land between the static prefix and the mustache
        const markable = afterName === undefined || afterName === '/' || afterName === '>' || /\s/.test(afterName);
        const markerLine = line;
        const markerColumn = column;

        // find the end of the open tag: quote-aware and mustache-aware, so a
        // '>' inside an attribute value or a handlebars argument never
        // terminates the tag early
        let j = nameEnd;
        let closed = false;
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
                j += 1; // past the closing quote
                continue;
            }
            if (c === '>') {
                closed = true;
                break;
            }
            j += 1;
        }

        if (markable && !EXISTING_MARKER.test(source.slice(nameEnd, j))) {
            insertions.push({
                offset: nameEnd,
                text: ` ${EDIT_MARKER_ATTRIBUTE}="${file}:${markerLine}:${markerColumn}"`
            });
        }

        if (!closed) {
            break;
        }
        const selfClosing = source[j - 1] === '/';
        advanceTo(j + 1);

        if (!selfClosing && RAWTEXT_TAGS.has(tagName.toLowerCase())) {
            // skip the element's raw text up to its matching close tag
            const needle = `</${tagName.toLowerCase()}`;
            let closeIdx = -1;
            for (let searchFrom = i; searchFrom < len;) {
                const found = lower.indexOf(needle, searchFrom);
                if (found === -1) {
                    break;
                }
                const following = source[found + needle.length];
                if (following === undefined || following === '>' || following === '/' || /\s/.test(following)) {
                    closeIdx = found;
                    break;
                }
                searchFrom = found + 1;
            }
            advanceTo(closeIdx === -1 ? len : closeIdx);
        }
    }

    if (insertions.length === 0) {
        return source;
    }
    let result = '';
    let last = 0;
    for (const insertion of insertions) {
        result += source.slice(last, insertion.offset) + insertion.text;
        last = insertion.offset;
    }
    return result + source.slice(last);
}
