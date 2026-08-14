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
 * marker side would not have produced. Position resolution and anchor
 * verification (stale-marker re-locate rules) live in edit-common.ts, shared
 * verbatim with the attribute applier (attribute-edit.ts): see that module's
 * doc block for the exact rules.
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
import {mustacheEnd, RAWTEXT_TAGS} from '../engine/source-scanner.ts';
import {editThemeFile, resolveMarkedOpenTag, type EditAnchor, type SourcePosition} from './edit-common.ts';
import type {EditMarker} from '../engine/markers.ts';
import type {ThemeFiles} from '../theme/theme-source.ts';

/** HTML void elements — no text child to edit. */
const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

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
export function applyTextEdit(source: string, position: SourcePosition, newText: string, anchor?: EditAnchor): string {
    const replacement = escapeNewText(newText);
    const at = `${position.line}:${position.column}`;

    const {tagName: lower, tagEnd} = resolveMarkedOpenTag(source, position, anchor);
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
export function applyThemeTextEdit<T extends ThemeFiles>(theme: T, marker: EditMarker, newText: string, anchor?: EditAnchor): T {
    return editThemeFile(theme, marker, source => applyTextEdit(source, marker, newText, anchor));
}
