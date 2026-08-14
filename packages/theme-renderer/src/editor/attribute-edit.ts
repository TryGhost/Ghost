/**
 * Attribute-edit half of the slice-5 anchored applier (image swaps: replace
 * `src`, clear `srcset`/`sizes`).
 *
 * `applyAttributeEdit(source, {line, column}, {name, value}, anchor?)` takes a
 * marker position (docs/markers.md — the 1-based position of an element's `<`
 * in the ORIGINAL theme source) and sets, replaces, or deletes the named
 * attribute on that open tag ONLY — the edit never reaches past the tag's
 * `>`. `applyThemeAttributeEdit` is the ThemeFiles-level wrapper (new files
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
 *   Attributes outside the block on the same tag remain editable.
 */
import errors from '@tryghost/errors';
import {mustacheEnd} from '../engine/source-scanner.ts';
import {editThemeFile, resolveMarkedOpenTag, type EditAnchor, type SourcePosition} from './edit-common.ts';
import type {EditMarker} from '../engine/markers.ts';
import type {ThemeFiles} from '../theme/theme-source.ts';

export type {SourcePosition} from './edit-common.ts';
export type {EditAnchor} from './edit-common.ts';

export interface AttributeEdit {
    /** Attribute name (plain HTML name; `data-edit` is reserved) */
    name: string;
    /** New value, or null to DELETE the attribute (no-op when absent) */
    value: string | null;
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

interface ScannedAttribute {
    /** Lowercased attribute name */
    name: string;
    /** Offset of the name's first character */
    start: number;
    /** Offset just past the token (name, or the value when present) */
    end: number;
    /** Mustache-block depth at the attribute ({{#…}}/{{^…}}…{{/…}} nesting) */
    blockDepth: number;
}

const BLOCK_OPEN = /^\{\{~?\s*(#|\^\s*[^\s}])/;
const BLOCK_CLOSE = /^\{\{~?\s*\//;

/**
 * Scans the attribute region of an open tag — `[from, to)`, between the tag
 * name and the closing `>` — yielding each static attribute token with the
 * handlebars-block depth it sits at. Mustaches are opaque (a value that IS a
 * mustache is part of its attribute's token; a free-standing mustache is
 * skipped), quoted values are quote-aware and may contain mustaches with
 * quoted arguments (`srcset="{{img_url a size="s"}} 300w"` — Casper).
 */
function* scanAttributes(source: string, from: number, to: number): Generator<ScannedAttribute, void, undefined> {
    let i = from;
    let blockDepth = 0;

    const skipValue = (at: number): number => {
        let j = at;
        const quote = source[j];
        if (quote === '"' || quote === '\'') {
            j += 1;
            while (j < to && source[j] !== quote) {
                j = source.startsWith('{{', j) ? mustacheEnd(source, j) : j + 1;
            }
            return Math.min(j + 1, to);
        }
        // unquoted value: up to whitespace (or the region end), mustache-aware
        while (j < to && !/\s/.test(source[j]!)) {
            j = source.startsWith('{{', j) ? mustacheEnd(source, j) : j + 1;
        }
        return j;
    };

    while (i < to) {
        const c = source[i]!;
        if (/\s/.test(c) || c === '/') {
            i += 1;
            continue;
        }
        if (source.startsWith('{{', i)) {
            const rest = source.slice(i, i + 24);
            if (BLOCK_OPEN.test(rest)) {
                blockDepth += 1;
            } else if (BLOCK_CLOSE.test(rest)) {
                blockDepth = Math.max(0, blockDepth - 1);
            }
            i = Math.min(mustacheEnd(source, i), to);
            continue;
        }

        const nameMatch = /^[^\s"'=/>{]+/.exec(source.slice(i, to));
        if (!nameMatch) {
            i += 1; // stray quote/equals — not an attribute start
            continue;
        }
        const start = i;
        const name = nameMatch[0];
        let j = i + name.length;

        if (source.startsWith('{{', j)) {
            // dynamic attribute name (`data-{{x}}=…`) — never a static match;
            // skip past the mustache and its value without yielding
            i = Math.min(mustacheEnd(source, j), to);
            continue;
        }

        // optional `= value`, whitespace-tolerant around the equals
        let k = j;
        while (k < to && /\s/.test(source[k]!)) {
            k += 1;
        }
        if (source[k] === '=') {
            k += 1;
            while (k < to && /\s/.test(source[k]!)) {
                k += 1;
            }
            j = skipValue(k);
        }

        yield {name: name.toLowerCase(), start, end: j, blockDepth};
        i = j;
    }
}

/** Newline-preserving replacement for a removed span (no-line-drift). */
function preserveNewlines(removed: string): string {
    const count = removed.split('\n').length - 1;
    return '\n'.repeat(count);
}

/**
 * Sets, replaces, or (value: null) deletes `edit.name` on the open tag whose
 * `<` is at `position` — see the module doc block for the exact semantics and
 * contract. Throws IncorrectUsageError for stale/unusable positions, invalid
 * names, and values that violate the plain-text contract.
 */
export function applyAttributeEdit(source: string, position: SourcePosition, edit: AttributeEdit, anchor?: EditAnchor): string {
    const name = validateName(edit.name);
    const want = name.toLowerCase();
    const escaped = edit.value === null ? null : escapeValue(edit.value);

    const {nameEnd, tagEnd} = resolveMarkedOpenTag(source, position, anchor);

    let found: ScannedAttribute | null = null;
    for (const attribute of scanAttributes(source, nameEnd, tagEnd.end)) {
        if (attribute.name !== want) {
            continue;
        }
        if (attribute.blockDepth > 0) {
            throw new errors.IncorrectUsageError({
                message: `the ${name} attribute at ${position.line}:${position.column} sits inside a handlebars block on the tag — editing one branch of a conditional is refused`
            });
        }
        if (!found) {
            found = attribute; // first occurrence wins, matching the HTML parser
        }
    }

    if (escaped === null) {
        if (!found) {
            return source; // deleting an absent attribute is a no-op
        }
        // remove the token plus its preceding whitespace run, keeping any
        // newlines the removed span contained (no-line-drift)
        let start = found.start;
        while (start > nameEnd && /\s/.test(source[start - 1]!)) {
            start -= 1;
        }
        return source.slice(0, start) + preserveNewlines(source.slice(start, found.end)) + source.slice(found.end);
    }

    const token = `${name}="${escaped}"`;
    if (found) {
        return source.slice(0, found.start) + token + preserveNewlines(source.slice(found.start, found.end)) + source.slice(found.end);
    }
    // missing attribute: insert immediately after the tag name — the same
    // always-static position the marker transform uses for data-edit
    return `${source.slice(0, nameEnd)} ${token}${source.slice(nameEnd)}`;
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
