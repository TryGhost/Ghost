/**
 * Attribute-edit half of the slice-5 anchored applier (image swaps: replace
 * `src`, clear `srcset`/`sizes`).
 *
 * `applyAttributeEdit(source, {line, column}, {name, value}, anchor?)` takes a
 * marker position (docs/markers.md — the 1-based position of an element's `<`
 * in the ORIGINAL theme source) and sets, replaces, or deletes the named
 * attribute on that open tag ONLY — the edit never reaches past the tag's
 * `>`. `applyAttributeEdits` is the batch form: several edits against the SAME
 * tag with one position/anchor resolution and one attribute scan, applied
 * right-to-left so every splice is computed against the original offsets; an
 * edit flagged `optional: true` that hits the handlebars-block refusal is
 * SKIPPED (and reported) instead of failing the batch — callers use this for
 * best-effort cleanup edits (clearing `srcset`/`sizes`) that must not discard
 * a successful required edit. `applyThemeAttributeEdit`/
 * `applyThemeAttributeEdits` are the ThemeFiles-level wrappers (new files
 * object for a new renderer, input never mutated), mirroring
 * `applyThemeTextEdit`.
 *
 * Safety contract — identical to text edits (shared via edit-common.ts):
 * anchor-verified against the clicked element's tagName, with the same
 * bounded stale-marker re-locate rules; dynamic tag names and unterminated
 * tags are refused via the shared source scanner.
 *
 * THE VALUE IS PLAIN ATTRIBUTE TEXT, by contract:
 *
 * - Handlebars syntax (`{{`/`}}`) is REJECTED — splicing it into template
 *   source would compile and execute (template injection).
 * - Newlines are REJECTED, and delete/replace of an attribute whose existing
 *   span DOES contain newlines re-inserts exactly that many, so an attribute
 *   edit never adds or removes lines (the no-line-drift invariant markers
 *   rely on; the re-inserted newlines are inter-attribute whitespace).
 * - `&` and `"` are HTML-ESCAPED (`&amp;`/`&quot;`) and the value is always
 *   written double-quoted, so it can never escape its quotes or smuggle
 *   further attributes.
 * - The attribute NAME must be a plain HTML attribute name (letters, digits,
 *   `-._:`), and `data-edit` is reserved — a theme-authored `data-edit`
 *   suppresses the marker transform, so writing one would make the element
 *   uneditable and shadow real markers.
 *
 * Semantics on the resolved open tag:
 *
 * - existing attribute (double-quoted, single-quoted, unquoted, or bare):
 *   the whole `name[=value]` token is replaced with `name="value"` in place
 *   (quotes normalized to double);
 * - missing attribute: inserted immediately after the tag name — the same
 *   position the marker transform injects `data-edit`, always inside a single
 *   static chunk even when the attribute list spans mustache boundaries;
 * - `value: null` DELETES the attribute (plus its preceding whitespace);
 *   deleting an attribute the tag does not have is a no-op — callers clear
 *   `srcset`/`sizes` unconditionally when swapping `src`;
 * - attributes that live inside a handlebars block on the tag itself
 *   (`<img {{#if x}}srcset="…"{{/if}}>`) are REFUSED, for replace and delete
 *   alike: editing one branch of a conditional silently keeps the other.
 *   Attributes outside the block on the same tag remain editable. In a batch,
 *   `optional: true` downgrades this refusal to a reported skip.
 */
import errors from '@tryghost/errors';
import {scanAttributes, type ScannedAttribute} from '../engine/source-scanner.ts';
import {editThemeFile, resolveMarkedOpenTag, type EditAnchor, type SourcePosition} from './edit-common.ts';
import type {EditMarker} from '../engine/markers.ts';
import type {ThemeFiles} from '../theme/theme-source.ts';

export interface AttributeEdit {
    /** Attribute name (plain HTML name; `data-edit` is reserved) */
    name: string;
    /** New value, or null to DELETE the attribute (no-op when absent) */
    value: string | null;
    /**
     * Batch-only: when true, the handlebars-block refusal SKIPS this edit
     * (reported via `skipped`) instead of throwing — for best-effort cleanup
     * edits that must not discard the rest of the batch. Contract violations
     * (bad name, non-plain-text value) always throw regardless.
     */
    optional?: boolean;
}

/** An optional edit the batch skipped, and the refusal it would have hit. */
export interface SkippedAttributeEdit {
    name: string;
    reason: string;
}

export interface AttributeEditsResult {
    source: string;
    skipped: SkippedAttributeEdit[];
}

/** Plain HTML attribute names only — no quotes/equals/slash/braces/space. */
const ATTRIBUTE_NAME = /^[a-zA-Z][a-zA-Z0-9._:-]*$/;

function validateName(name: string): string {
    if (!ATTRIBUTE_NAME.test(name)) {
        throw new errors.IncorrectUsageError({
            message: `"${name}" is not a valid attribute name — names are letters, digits and "-._:" only`
        });
    }
    if (name.toLowerCase() === 'data-edit') {
        throw new errors.IncorrectUsageError({
            message: 'the data-edit attribute name is reserved for source markers and cannot be edited'
        });
    }
    return name;
}

/**
 * Validates the value contract (module doc block: plain attribute text only)
 * and returns the escaped text to place inside double quotes.
 */
function escapeValue(value: string): string {
    if (value.includes('{{') || value.includes('}}')) {
        throw new errors.IncorrectUsageError({
            message: 'attribute value must be plain text — handlebars syntax ("{{" or "}}") is rejected because splicing it into template source would be a template-injection risk'
        });
    }
    if (/[\r\n]/.test(value)) {
        throw new errors.IncorrectUsageError({
            message: 'attribute value must be a single line — a newline would shift the line numbers of every later marker in the file'
        });
    }
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Newline-preserving replacement for a removed span (no-line-drift). */
function preserveNewlines(removed: string): string {
    const count = removed.split('\n').length - 1;
    return '\n'.repeat(count);
}

interface Splice {
    start: number;
    end: number;
    text: string;
    index: number;
}

/**
 * Applies a BATCH of attribute edits to the open tag whose `<` is at
 * `position`: one position/anchor resolution and one attribute scan serve
 * every edit, and the resulting splices are applied right-to-left so each is
 * computed against the ORIGINAL source offsets. See the module doc block for
 * the per-edit semantics, the `optional` skip rule, and the contract. Throws
 * IncorrectUsageError for stale/unusable positions, invalid names, values
 * that violate the plain-text contract, duplicate names in one batch, and
 * (non-optional) block-refusals.
 */
export function applyAttributeEdits(source: string, position: SourcePosition, edits: AttributeEdit[], anchor?: EditAnchor): AttributeEditsResult {
    // Validate the whole batch up front — a contract violation anywhere
    // rejects the batch before anything is resolved or spliced.
    const prepared = edits.map(edit => ({
        edit,
        name: validateName(edit.name),
        want: edit.name.toLowerCase(),
        escaped: edit.value === null ? null : escapeValue(edit.value)
    }));

    const wanted = new Set<string>();
    for (const {want} of prepared) {
        if (wanted.has(want)) {
            throw new errors.IncorrectUsageError({
                message: `the ${want} attribute appears twice in one edit batch — each attribute can be edited once per batch`
            });
        }
        wanted.add(want);
    }

    const {nameEnd, tagEnd} = resolveMarkedOpenTag(source, position, anchor);
    const attributes = [...scanAttributes(source, nameEnd, tagEnd.end)];

    const splices: Splice[] = [];
    const skipped: SkippedAttributeEdit[] = [];

    for (const [index, {edit, name, want, escaped}] of prepared.entries()) {
        let found: ScannedAttribute | null = null;
        let blocked = false;
        for (const attribute of attributes) {
            if (attribute.name !== want) {
                continue;
            }
            if (attribute.blockDepth > 0) {
                blocked = true;
            } else if (!found) {
                found = attribute; // first occurrence wins, matching the HTML parser
            }
        }

        if (blocked) {
            const reason = `the ${name} attribute at ${position.line}:${position.column} sits inside a handlebars block on the tag — editing one branch of a conditional is refused`;
            if (edit.optional) {
                skipped.push({name, reason});
                continue;
            }
            throw new errors.IncorrectUsageError({message: reason});
        }

        if (escaped === null) {
            if (!found) {
                continue; // deleting an absent attribute is a no-op
            }
            // remove the token plus its preceding whitespace run, keeping any
            // newlines the removed span contained (no-line-drift)
            let start = found.start;
            while (start > nameEnd && /\s/.test(source[start - 1]!)) {
                start -= 1;
            }
            splices.push({start, end: found.end, text: preserveNewlines(source.slice(start, found.end)), index});
            continue;
        }

        const token = `${name}="${escaped}"`;
        if (found) {
            splices.push({start: found.start, end: found.end, text: token + preserveNewlines(source.slice(found.start, found.end)), index});
        } else {
            // missing attribute: insert immediately after the tag name — the
            // same always-static position the marker transform uses
            splices.push({start: nameEnd, end: nameEnd, text: ` ${token}`, index});
        }
    }

    // Right-to-left: later splices first, so earlier offsets stay valid. Ties
    // (a point-insert at nameEnd next to a deletion starting there, or two
    // inserts) apply the later-listed edit first so the final attribute order
    // follows the batch order.
    splices.sort((a, b) => (b.start - a.start) || (b.end - a.end) || (b.index - a.index));

    let result = source;
    for (const splice of splices) {
        result = result.slice(0, splice.start) + splice.text + result.slice(splice.end);
    }
    return {source: result, skipped};
}

/**
 * Sets, replaces, or (value: null) deletes `edit.name` on the open tag whose
 * `<` is at `position` — the single-edit form of {@link applyAttributeEdits}
 * (the `optional` flag has no effect here: with nothing else in the batch, a
 * block-refusal always throws).
 */
export function applyAttributeEdit(source: string, position: SourcePosition, edit: AttributeEdit, anchor?: EditAnchor): string {
    return applyAttributeEdits(source, position, [{...edit, optional: false}], anchor).source;
}

/**
 * ThemeFiles-level attribute edit: applies `applyAttributeEdit` to
 * `marker.file` and returns a NEW files object of the same shape (the input
 * is never mutated) — feed it to a fresh `createRenderer` and re-render
 * (docs/markers.md §editor loop).
 */
export function applyThemeAttributeEdit<T extends ThemeFiles>(theme: T, marker: EditMarker, edit: AttributeEdit, anchor?: EditAnchor): T {
    return editThemeFile(theme, marker, source => applyAttributeEdit(source, marker, edit, anchor));
}

/**
 * ThemeFiles-level BATCH attribute edit: applies `applyAttributeEdits` to
 * `marker.file` and returns the new files object plus the optional edits the
 * batch skipped (handlebars-block refusals on `optional: true` edits — the
 * caller decides whether to warn).
 */
export function applyThemeAttributeEdits<T extends ThemeFiles>(theme: T, marker: EditMarker, edits: AttributeEdit[], anchor?: EditAnchor): {theme: T; skipped: SkippedAttributeEdit[]} {
    let skipped: SkippedAttributeEdit[] = [];
    const next = editThemeFile(theme, marker, (source) => {
        const result = applyAttributeEdits(source, marker, edits, anchor);
        ({skipped} = result);
        return result.source;
    });
    return {theme: next, skipped};
}
