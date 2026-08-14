/**
 * Text-edit half of the slice-3 editor loop (fresh code, deliberately small).
 *
 * `applyTextEdit(source, {line, column}, newText, anchor?)` takes a marker
 * position (from `parseEditMarker` — the 1-based position of an element's `<`
 * in the ORIGINAL theme source, see docs/markers.md) and replaces the
 * element's immediate text child. `applyThemeTextEdit` is the ThemeFiles-level
 * wrapper the editor loop uses: it returns a NEW files object for a NEW
 * renderer (fresh renderer per edit is the supported path for this slice —
 * `engine.resetCache()` does not re-register partials). Both are exported
 * from the `@tryghost/theme-renderer/editor` subpath — they are editor-side
 * tools, not part of the render contract on the package root.
 *
 * NEWTEXT IS PLAIN TEXT, by contract:
 *
 * - Handlebars syntax (`{{` or `}}`) is REJECTED. The replacement is spliced
 *   into template source, so mustaches in newText would compile and execute —
 *   a clicked-in edit must never become template code (template injection:
 *   think a visitor-suggested title of `{{@site.members_api_key}}`).
 * - Newlines are REJECTED. Marker positions are line-based and edits must
 *   never shift line numbers of untouched markers in the same file (the
 *   no-line-drift invariant markers rely on, docs/markers.md).
 * - `&` and `<` are HTML-ESCAPED (`&amp;`/`&lt;`), so the replacement always
 *   renders literally — `Tom & Jerry` stays `Tom & Jerry`, and markup like
 *   `</h1><script>` cannot smuggle elements into the page.
 *
 * All tag detection (exact-position and re-locate) goes through the shared
 * source scanner (src/engine/source-scanner.ts) — the same primitives the
 * marker transform uses, so the edit side can never accept a position the
 * marker side would not have produced.
 *
 * Anchor verification: edits are positional, and positions go stale — in a
 * multi-edit batch, an earlier edit can shift every later marker in the same
 * file. When the caller passes the clicked element's tag name as an anchor,
 * the edit is only applied if `<tagname` is actually at the marker position;
 * on a mismatch a bounded re-locate looks for the anchored tag within
 * ±RELOCATE_LINES lines and uses it only when it is the UNIQUE candidate.
 * Re-locate candidates are scanner-yielded tags only — markable static open
 * tags outside HTML/hbs comments and rawtext bodies — because a marker can
 * only ever have pointed at one of those. Positions outside the file, and
 * anything else ambiguous, fail loudly as a stale marker rather than editing
 * the wrong element.
 *
 * WHAT COUNTS AS THE "TEXT CHILD" — honest limits of this slice (this is a
 * loop proof, not a production editor):
 *
 * - The run of plain text and INLINE handlebars expressions (`{{title}}`,
 *   `{{{html}}}`, partials, comments) immediately after the open tag, up to
 *   the first nested `<` tag or the first block-helper mustache
 *   (`{{#…}}`/`{{^…}}`/`{{/…}}`/`{{else}}`/`{{{{raw}}}}`, with or without
 *   whitespace-control tildes — `{{~#if}}` is the same block construct).
 *   Leading/trailing whitespace of the run is preserved; the core is replaced
 *   wholesale, so a mustache child like `{{@site.title}}` becomes the literal
 *   replacement.
 * - Stopping at block boundaries is a safety rule, not laziness: replacing a
 *   `{{#block}}` opener whose `{{/close}}` lies past the first nested tag
 *   would orphan the closer and break the template.
 * - Elements whose content starts with a block or a nested tag (e.g. Casper's
 *   `post-card-title`, which opens with `{{#unless access}}`), void or
 *   self-closing elements, and rawtext elements (`script`/`style`/
 *   `textarea`/`title`) are refused — the editor treats them as not directly
 *   editable in this slice.
 * - Repeated elements rendered from one source location ({{#foreach}} over a
 *   partial) share ONE marker, so one edit changes ALL iterations — correct:
 *   they genuinely have a single source position.
 */
import errors from '@tryghost/errors';
import {mustacheEnd, openTagEnd, openTagNameAt, RAWTEXT_TAGS, scanSourceTags} from '../engine/source-scanner.ts';
import type {EditMarker} from '../engine/markers.ts';
import type {ThemeFiles} from '../theme/theme-source.ts';

export type {EditMarker} from '../engine/markers.ts';

export interface SourcePosition {
    /** 1-based line of the element's `<` in the original source */
    line: number;
    /** 1-based column of the element's `<` in the original source */
    column: number;
}

export interface TextEditAnchor {
    /**
     * Expected tag name of the element at the marker position
     * (case-insensitive — pass the clicked DOM element's `tagName` directly).
     */
    tagName: string;
}

/** How far (in lines, each direction) a stale anchored marker may re-locate. */
const RELOCATE_LINES = 3;

/** HTML void elements — no text child to edit. */
const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

/** Offsets at which each 1-based line starts. */
function lineStartOffsets(source: string): number[] {
    const offsets = [0];
    for (let i = 0; i < source.length; i += 1) {
        if (source.charCodeAt(i) === 10 /* \n */) {
            offsets.push(i + 1);
        }
    }
    return offsets;
}

/** Absolute offset of a 1-based position, or null when outside the source. */
function offsetAt(source: string, lineStarts: number[], position: SourcePosition): number | null {
    if (position.line < 1 || position.line > lineStarts.length || position.column < 1) {
        return null;
    }
    const start = lineStarts[position.line - 1]!;
    const end = position.line < lineStarts.length ? lineStarts[position.line]! : source.length;
    const offset = start + position.column - 1;
    return offset < end ? offset : null;
}

/**
 * Anchor-verified offset resolution: exact position when the anchored tag is
 * there; otherwise a bounded re-locate (±RELOCATE_LINES) that only succeeds on
 * a UNIQUE candidate. Both paths accept only scanner-yielded tags — markable
 * static open tags the marker transform would have marked — so a stale marker
 * can never re-locate into an HTML/hbs comment, a rawtext element body, or a
 * dynamic tag. Everything else is a stale marker and throws.
 */
function resolveAnchoredOffset(source: string, lineStarts: number[], position: SourcePosition, anchor: TextEditAnchor, offset: number | null): number {
    const want = anchor.tagName.toLowerCase();
    const staleError = (detail: string): Error => new errors.IncorrectUsageError({
        message: `stale marker: expected an <${want}> open tag at ${position.line}:${position.column}${detail}`
    });

    if (position.line < 1 || position.line > lineStarts.length) {
        // a line outside the file belongs to a different revision of it —
        // refuse instead of re-locating within a clamped window
        throw staleError(` — line ${position.line} is outside the file (${lineStarts.length} lines)`);
    }

    const fromLine = Math.max(1, position.line - RELOCATE_LINES);
    const toLine = Math.min(lineStarts.length, position.line + RELOCATE_LINES);
    const from = lineStarts[fromLine - 1]!;
    const to = toLine < lineStarts.length ? lineStarts[toLine]! : source.length;

    const candidates: number[] = [];
    for (const tag of scanSourceTags(source)) {
        if (tag.start >= to) {
            break;
        }
        if (!tag.markable || !tag.closed || tag.tagName.toLowerCase() !== want) {
            continue;
        }
        if (offset !== null && tag.start === offset) {
            // the anchored tag is exactly at the marker position — fresh marker
            return offset;
        }
        if (tag.start >= from) {
            candidates.push(tag.start);
        }
    }
    if (candidates.length === 1) {
        return candidates[0]!;
    }
    throw staleError(
        candidates.length === 0
            ? `, and none found within ±${RELOCATE_LINES} lines`
            : `, and ${candidates.length} candidates found within ±${RELOCATE_LINES} lines — cannot re-locate safely`
    );
}

/** True when the mustache at `at` opens/closes/continues a block section. */
function isBlockBoundary(source: string, at: number): boolean {
    // {{#…}} {{^…}} {{/…}} {{else}} and {{{{raw}}}} blocks, with or without
    // whitespace-control tildes ({{~#if}}, {{~/if}}, {{~else}}, {{{{~raw}}}})
    return /^\{\{\{\{|^\{\{~?\s*[#^/]|^\{\{~?\s*else\b/.test(source.slice(at, at + 16));
}

/**
 * Validates the newText contract (module doc block: plain text only) and
 * returns the HTML-escaped replacement to splice into the source.
 */
function escapeNewText(newText: string): string {
    if (newText.includes('{{') || newText.includes('}}')) {
        throw new errors.IncorrectUsageError({
            message: 'newText must be plain text — handlebars syntax ("{{" or "}}") is rejected because splicing it into template source would be a template-injection risk'
        });
    }
    if (/[\r\n]/.test(newText)) {
        throw new errors.IncorrectUsageError({
            message: 'newText must be a single line — a newline would shift the line numbers of every later marker in the file'
        });
    }
    return newText.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/**
 * Replaces the immediate text child of the element whose open tag starts at
 * `position` (see the module doc block for the exact semantics, the newText
 * plain-text contract, and the limits). Throws IncorrectUsageError for
 * positions the editor must treat as not editable, for stale anchored
 * markers, and for newText that violates the contract.
 */
export function applyTextEdit(source: string, position: SourcePosition, newText: string, anchor?: TextEditAnchor): string {
    const replacement = escapeNewText(newText);
    const lineStarts = lineStartOffsets(source);
    const at = `${position.line}:${position.column}`;

    let offset = offsetAt(source, lineStarts, position);
    if (anchor) {
        offset = resolveAnchoredOffset(source, lineStarts, position, anchor, offset);
    } else if (offset === null) {
        throw new errors.IncorrectUsageError({message: `position ${at} is outside the source`});
    }

    const tag = openTagNameAt(source, offset);
    if (!tag || !tag.markable) {
        throw new errors.IncorrectUsageError({message: `position ${at} does not point at an element open tag`});
    }
    const lower = tag.tagName.toLowerCase();

    const tagEnd = openTagEnd(source, tag.nameEnd);
    if (!tagEnd.closed) {
        throw new errors.IncorrectUsageError({message: `unterminated open tag <${lower}> at ${at}`});
    }
    if (tagEnd.selfClosing || VOID_TAGS.has(lower)) {
        throw new errors.IncorrectUsageError({message: `<${lower}> at ${at} has no text child to edit`});
    }
    if (RAWTEXT_TAGS.has(lower)) {
        throw new errors.IncorrectUsageError({message: `<${lower}> at ${at} is a rawtext element — its content is not editable text`});
    }

    // The immediate text run: plain text + inline mustaches, up to the first
    // nested tag or block-helper boundary.
    const contentStart = tagEnd.end + 1;
    let k = contentStart;
    while (k < source.length) {
        const c = source[k];
        if (c === '{' && source.startsWith('{{', k)) {
            if (isBlockBoundary(source, k)) {
                break;
            }
            k = mustacheEnd(source, k);
            continue;
        }
        if (c === '<') {
            break;
        }
        k += 1;
    }

    const run = source.slice(contentStart, k);
    const leadLength = run.length - run.trimStart().length;
    const trailLength = run.length - run.trimEnd().length;
    const core = run.slice(leadLength, run.length - trailLength);
    if (core === '') {
        throw new errors.IncorrectUsageError({
            message: `no editable text: <${lower}> at ${at} has no text or inline expression before its first child element or block`
        });
    }

    return source.slice(0, contentStart) + run.slice(0, leadLength) + replacement + run.slice(run.length - trailLength) + source.slice(k);
}

/**
 * ThemeFiles-level edit: applies `applyTextEdit` to `marker.file` and returns
 * a NEW files object of the same shape (the input is never mutated) — feed it
 * to a fresh `createRenderer` and re-render (docs/markers.md §editor loop).
 */
export function applyThemeTextEdit<T extends ThemeFiles>(theme: T, marker: EditMarker, newText: string, anchor?: TextEditAnchor): T {
    if (theme instanceof Map) {
        const source = theme.get(marker.file);
        if (source === undefined) {
            throw new errors.IncorrectUsageError({message: `no theme file '${marker.file}' — the marker does not match this theme`});
        }
        const next = new Map(theme);
        next.set(marker.file, applyTextEdit(source, marker, newText, anchor));
        return next as T;
    }
    const source = theme[marker.file];
    if (typeof source !== 'string') {
        throw new errors.IncorrectUsageError({message: `no theme file '${marker.file}' — the marker does not match this theme`});
    }
    return {...theme, [marker.file]: applyTextEdit(source, marker, newText, anchor)};
}
