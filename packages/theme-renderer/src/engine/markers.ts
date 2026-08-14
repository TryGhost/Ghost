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
 * The tag scanning itself lives in src/engine/source-scanner.ts — the shared
 * definition of "a static, markable open tag" that the text-edit applier
 * (src/editor/text-edit.ts) must agree with. It is a lightweight raw scan
 * that treats handlebars mustaches as opaque regions (chosen over a hbs.parse
 * AST walk: the AST's ContentStatement values are whitespace-stripped/
 * unescaped copies, while a raw scan keeps original positions exact and
 * handles tags whose attribute lists span mustache boundaries — `<html
 * lang="{{@site.locale}}"{{#match …}}…{{/match}}>` — for free, because the
 * marker lands right after the tag name, always inside a single static
 * chunk).
 *
 * This module is also exported standalone as the `./markers` subpath so
 * consumers of marked render output (the admin-toolbar edit-mode chunk) can
 * import parseEditMarker/EDIT_MARKER_ATTRIBUTE without dragging the engine
 * barrel — and with it the whole renderer — into their bundle. Keep this
 * file's imports limited to the source scanner for that reason.
 *
 * Deliberate punts (documented in docs/markers.md): helper-emitted HTML,
 * dynamic tag names, raw-block ({{{{raw}}}}) content, and rawtext element
 * content (script/style/textarea/title) are never marked. Malformed tags
 * (tag-end walk runs away to EOF) get no marker and cost nothing else — the
 * scanner recovers at the next `<` and the rest of the file is still marked.
 */
import {scanAttributes, scanSourceTags} from './source-scanner.ts';

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
 * data-edit already present ON the tag (theme-authored) — never double-mark.
 * Checked against scanner-yielded attribute NAMES, not a regex over the raw
 * tag region: a value merely CONTAINING the text `data-edit=` (e.g.
 * `<div title="see data-edit=docs">`) must not suppress the marker.
 */
function hasExistingMarker(source: string, nameEnd: number, end: number): boolean {
    for (const attribute of scanAttributes(source, nameEnd, end)) {
        if (attribute.name === EDIT_MARKER_ATTRIBUTE) {
            return true;
        }
    }
    return false;
}

function escapeAttributeValue(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Stamps every static HTML open tag in a handlebars source with a
 * `data-edit="<filename>:<line>:<column>"` marker attribute, inserted
 * immediately after the tag name. Returns the source unchanged when there is
 * nothing to mark.
 */
export function injectEditMarkers(source: string, filename: string): string {
    const file = escapeAttributeValue(filename);
    const insertions: {offset: number; text: string}[] = [];

    for (const tag of scanSourceTags(source)) {
        // dynamic tag names and malformed (unterminated) tags get no marker —
        // an attribute inserted into either would corrupt the output
        if (!tag.markable || !tag.closed) {
            continue;
        }
        if (hasExistingMarker(source, tag.nameEnd, tag.end)) {
            continue;
        }
        insertions.push({
            offset: tag.nameEnd,
            text: ` ${EDIT_MARKER_ATTRIBUTE}="${file}:${tag.line}:${tag.column}"`
        });
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
