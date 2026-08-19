import {THEME_EDITOR_ARCHIVE_LIMITS, isEditablePath, normaliseRelativePath} from '@tryghost/theme-renderer/editor/archive';

import {cloneThemeDraft, withThemeRevision} from './theme-state';

import type {BuilderToolResult} from '@/builder/core/tool-types';
import type {ThemeDraft, ThemeFile} from './theme-state';

export const THEME_TEXT_LIMITS = {
    maxFileBytes: 2 * 1024 * 1024,
    maxTotalBytes: 16 * 1024 * 1024,
    maxReadLines: 500,
    maxReadCharacters: 16 * 1024,
    maxSearchMatches: 100,
    maxSearchLineCharacters: 500,
    maxSearchScannedCharacters: 2 * 1024 * 1024,
    maxSearchPatternCharacters: 256
} as const;

type ThemeFileSummary = {
    path: string;
    kind: ThemeFile['kind'];
    sizeBytes: number;
};

type ThemeSearchMatch = {
    path: string;
    line: number;
    column: number;
    text: string;
};

export type ThemeCandidateResult<T> =
    | {ok: true; revision: string; data: T; candidate: ThemeDraft}
    | Extract<BuilderToolResult<never>, {ok: false}>;

type ToolFailure = Extract<BuilderToolResult<never>, {ok: false}>;

type MutationInput = {
    revision: string;
    path: string;
};

const encoder = new TextEncoder();

function failure(draft: ThemeDraft, code: string, message: string, retryable = false, details?: unknown): ToolFailure {
    return {
        ok: false,
        revision: draft.revision,
        error: {code, message, retryable, ...(details === undefined ? {} : {details})}
    };
}

function normalizedSafePath(draft: ThemeDraft, path: unknown): BuilderToolResult<{path: string}> {
    if (typeof path !== 'string' || !path || path.includes('\0') || path.includes('\\') || path.startsWith('/') || /^[A-Za-z]:\//.test(path)) {
        return failure(draft, 'unsafe_path', 'Use a non-empty path relative to the theme root, with forward slashes only.');
    }
    const segments = path.split('/');
    if (segments.some(segment => !segment || segment === '.' || segment === '..') || normaliseRelativePath(path) !== path) {
        return failure(draft, 'unsafe_path', 'The file path must stay inside the theme root and must not contain traversal segments.');
    }
    return {ok: true, revision: draft.revision, data: {path}};
}

function currentRevision(draft: ThemeDraft, revision: unknown): BuilderToolResult<null> {
    if (typeof revision !== 'string' || revision !== draft.revision) {
        return failure(draft, 'stale_revision', 'The theme changed since this tool call was prepared. Read the latest revision and retry.', true, {currentRevision: draft.revision});
    }
    return {ok: true, revision: draft.revision, data: null};
}

function textFile(draft: ThemeDraft, path: unknown): BuilderToolResult<{path: string; file: ThemeFile & {kind: 'text'; content: string}}> {
    const safe = normalizedSafePath(draft, path);
    if (!safe.ok) {
        return safe;
    }
    const file = Object.hasOwn(draft.files, safe.data.path) ? draft.files[safe.data.path] : undefined;
    if (!file) {
        return failure(draft, 'file_not_found', `No theme file exists at ${safe.data.path}.`);
    }
    if (file.kind !== 'text' || file.content === null) {
        return failure(draft, 'binary_file', `${safe.data.path} is a binary file and cannot be read or written as text.`);
    }
    return {ok: true, revision: draft.revision, data: {path: safe.data.path, file: file as ThemeFile & {kind: 'text'; content: string}}};
}

function validateTextSize(draft: ThemeDraft, path: string, content: string): BuilderToolResult<null> {
    const fileBytes = encoder.encode(content).byteLength;
    if (fileBytes > THEME_TEXT_LIMITS.maxFileBytes) {
        return failure(draft, 'file_too_large', `Text files must stay under ${THEME_TEXT_LIMITS.maxFileBytes} bytes.`, false, {path, sizeBytes: fileBytes});
    }
    const totalBytes = Object.entries(draft.files).reduce((total, [candidatePath, file]) => {
        if (candidatePath === path || file.kind !== 'text' || file.content === null) {
            return total;
        }
        return total + encoder.encode(file.content).byteLength;
    }, fileBytes);
    if (totalBytes > THEME_TEXT_LIMITS.maxTotalBytes) {
        return failure(draft, 'theme_text_too_large', `Theme text must stay under ${THEME_TEXT_LIMITS.maxTotalBytes} bytes.`, false, {sizeBytes: totalBytes});
    }
    return {ok: true, revision: draft.revision, data: null};
}

async function revisedCandidate<T>(draft: ThemeDraft, update: (candidate: ThemeDraft) => T): Promise<{candidate: ThemeDraft; data: T}> {
    const candidate = cloneThemeDraft(draft);
    const data = update(candidate);
    return {candidate: await withThemeRevision(candidate), data};
}

export function listThemeFiles(draft: ThemeDraft): BuilderToolResult<{files: ThemeFileSummary[]}> {
    const files = Object.keys(draft.files).sort().map((path): ThemeFileSummary => {
        const file = draft.files[path];
        return {
            path,
            kind: file.kind,
            sizeBytes: file.kind === 'text' ? encoder.encode(file.content ?? '').byteLength : file.binary?.byteLength ?? 0
        };
    });
    return {ok: true, revision: draft.revision, data: {files}};
}

export function searchThemeFiles(draft: ThemeDraft, input: {query?: unknown; regex?: unknown}): BuilderToolResult<{matches: ThemeSearchMatch[]; truncated: boolean}> {
    if (typeof input.query !== 'string' || !input.query) {
        return failure(draft, 'invalid_search_query', 'Provide a non-empty text search query.');
    }
    if (input.query.length > THEME_TEXT_LIMITS.maxSearchPatternCharacters) {
        return failure(draft, 'search_pattern_too_large', `Search queries must stay under ${THEME_TEXT_LIMITS.maxSearchPatternCharacters} characters.`);
    }
    let expression: RegExp;
    try {
        expression = input.regex === true
            ? new RegExp(input.query, 'g')
            : new RegExp(input.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    } catch {
        return failure(draft, 'invalid_search_pattern', 'The regular-expression search query is invalid.');
    }
    if (input.regex === true && !isSafeSearchPattern(input.query)) {
        return failure(draft, 'unsafe_search_pattern', 'This regular expression can cause excessive backtracking. Use no groups or counted repetitions, and at most one unbounded quantifier.');
    }
    const matches: ThemeSearchMatch[] = [];
    let truncated = false;
    let remainingCharacters = THEME_TEXT_LIMITS.maxSearchScannedCharacters;
    for (const path of Object.keys(draft.files).sort()) {
        const file = draft.files[path];
        if (file.kind !== 'text' || file.content === null) {
            continue;
        }
        const lines = file.content.split('\n');
        for (const [lineIndex, line] of lines.entries()) {
            if (remainingCharacters <= 0) {
                return {ok: true, revision: draft.revision, data: {matches, truncated: true}};
            }
            const searchable = line.slice(0, remainingCharacters);
            remainingCharacters -= searchable.length;
            if (searchable.length < line.length) {
                truncated = true;
            }
            expression.lastIndex = 0;
            let match = expression.exec(searchable);
            while (match) {
                if (matches.length === THEME_TEXT_LIMITS.maxSearchMatches) {
                    truncated = true;
                    return {ok: true, revision: draft.revision, data: {matches, truncated}};
                }
                matches.push({
                    path,
                    line: lineIndex + 1,
                    column: match.index + 1,
                    text: line.slice(0, THEME_TEXT_LIMITS.maxSearchLineCharacters)
                });
                if (match[0].length === 0) {
                    expression.lastIndex += 1;
                }
                match = expression.exec(searchable);
            }
        }
    }
    return {ok: true, revision: draft.revision, data: {matches, truncated}};
}

export function readThemeFile(draft: ThemeDraft, input: {path?: unknown; startLine?: unknown; endLine?: unknown; startColumn?: unknown}): BuilderToolResult<{path: string; startLine: number; startColumn: number; endLine: number; totalLines: number; content: string; truncated: boolean; next: {line: number; column: number} | null}> {
    const resolved = textFile(draft, input.path);
    if (!resolved.ok) {
        return resolved;
    }
    const lines = resolved.data.file.content.split('\n');
    const startLine = input.startLine === undefined ? 1 : input.startLine;
    const startColumn = input.startColumn === undefined ? 1 : input.startColumn;
    const requestedEnd = input.endLine === undefined ? Math.min(lines.length, Number(startLine) + THEME_TEXT_LIMITS.maxReadLines - 1) : input.endLine;
    if (!Number.isInteger(startLine) || !Number.isInteger(startColumn) || !Number.isInteger(requestedEnd) || Number(startLine) < 1 || Number(startColumn) < 1 || Number(requestedEnd) < Number(startLine)) {
        return failure(draft, 'invalid_line_range', 'Line ranges use positive, inclusive line numbers.');
    }
    const endLine = Math.min(Number(requestedEnd), lines.length, Number(startLine) + THEME_TEXT_LIMITS.maxReadLines - 1);
    if (Number(startLine) > lines.length) {
        return failure(draft, 'invalid_line_range', `${resolved.data.path} has only ${lines.length} lines.`);
    }
    if (Number(startColumn) > lines[Number(startLine) - 1].length + 1) {
        return failure(draft, 'invalid_line_range', `Line ${Number(startLine)} has only ${lines[Number(startLine) - 1].length} characters.`);
    }
    const chunks: string[] = [];
    let remaining = THEME_TEXT_LIMITS.maxReadCharacters;
    let next: {line: number; column: number} | null = null;
    for (let lineNumber = Number(startLine); lineNumber <= endLine; lineNumber += 1) {
        const column = lineNumber === Number(startLine) ? Number(startColumn) : 1;
        const prefix = `${lineNumber}: `;
        const line = lines[lineNumber - 1].slice(column - 1);
        const separatorLength = chunks.length ? 1 : 0;
        const available = remaining - prefix.length - separatorLength;
        if (available <= 0) {
            next = {line: lineNumber, column};
            break;
        }
        const visible = line.slice(0, available);
        chunks.push(`${prefix}${visible}`);
        remaining -= prefix.length + visible.length + separatorLength;
        if (visible.length < line.length) {
            next = {line: lineNumber, column: column + visible.length};
            break;
        }
    }
    const requestedEndInFile = Math.min(Number(requestedEnd), lines.length);
    if (!next && (endLine < requestedEndInFile || (endLine < lines.length && input.endLine === undefined))) {
        next = {line: endLine + 1, column: 1};
    }
    return {
        ok: true,
        revision: draft.revision,
        data: {
            path: resolved.data.path,
            startLine: Number(startLine),
            startColumn: Number(startColumn),
            endLine,
            totalLines: lines.length,
            content: chunks.join('\n'),
            truncated: next !== null,
            next
        }
    };
}

export async function replaceInThemeFile(draft: ThemeDraft, input: MutationInput & {oldText: unknown; newText: unknown}): Promise<ThemeCandidateResult<{path: string; replacements: 1}>> {
    const revision = currentRevision(draft, input.revision);
    if (!revision.ok) {
        return revision;
    }
    const resolved = textFile(draft, input.path);
    if (!resolved.ok) {
        return resolved;
    }
    if (typeof input.oldText !== 'string' || !input.oldText || typeof input.newText !== 'string') {
        return failure(draft, 'invalid_replacement', 'Provide non-empty oldText and string newText values.');
    }
    const first = resolved.data.file.content.indexOf(input.oldText);
    if (first === -1) {
        return failure(draft, 'replacement_not_found', `The exact text was not found in ${resolved.data.path}. Read the latest file and retry.`);
    }
    if (resolved.data.file.content.indexOf(input.oldText, first + input.oldText.length) !== -1) {
        return failure(draft, 'replacement_ambiguous', `The exact text appears more than once in ${resolved.data.path}. Include more surrounding text.`);
    }
    const content = `${resolved.data.file.content.slice(0, first)}${input.newText}${resolved.data.file.content.slice(first + input.oldText.length)}`;
    const size = validateTextSize(draft, resolved.data.path, content);
    if (!size.ok) {
        return size;
    }
    const {candidate, data} = await revisedCandidate(draft, (next) => {
        next.files[resolved.data.path].content = content;
        return {path: resolved.data.path, replacements: 1 as const};
    });
    return {ok: true, revision: candidate.revision, data, candidate};
}

export async function writeThemeFile(draft: ThemeDraft, input: MutationInput & {content: unknown}): Promise<ThemeCandidateResult<{path: string; created: boolean}>> {
    const revision = currentRevision(draft, input.revision);
    if (!revision.ok) {
        return revision;
    }
    const safe = normalizedSafePath(draft, input.path);
    if (!safe.ok) {
        return safe;
    }
    if (typeof input.content !== 'string') {
        return failure(draft, 'invalid_file_content', 'File content must be text.');
    }
    const existing = Object.hasOwn(draft.files, safe.data.path) ? draft.files[safe.data.path] : undefined;
    if (existing?.kind === 'binary') {
        return failure(draft, 'binary_file', `${safe.data.path} is a binary file and cannot be replaced with text.`);
    }
    if (!existing && !isEditablePath(safe.data.path)) {
        return failure(draft, 'binary_file', `${safe.data.path} is classified as a binary file. Builder v1 can only create text-file paths.`);
    }
    if (!existing && Object.keys(draft.files).length >= THEME_EDITOR_ARCHIVE_LIMITS.maxFiles) {
        return failure(draft, 'too_many_files', `Themes can contain at most ${THEME_EDITOR_ARCHIVE_LIMITS.maxFiles} files.`);
    }
    const size = validateTextSize(draft, safe.data.path, input.content);
    if (!size.ok) {
        return size;
    }
    const created = !existing;
    const {candidate, data} = await revisedCandidate(draft, (next) => {
        const file: ThemeFile = existing ? {...existing, content: input.content as string} : {
            path: safe.data.path,
            kind: 'text',
            content: input.content as string,
            binary: null,
            unixPermissions: null,
            dosPermissions: null
        };
        next.files = {...next.files, [safe.data.path]: file};
        return {path: safe.data.path, created};
    });
    return {ok: true, revision: candidate.revision, data, candidate};
}

export async function deleteThemeFile(draft: ThemeDraft, input: MutationInput): Promise<ThemeCandidateResult<{path: string; deleted: true}>> {
    const revision = currentRevision(draft, input.revision);
    if (!revision.ok) {
        return revision;
    }
    const safe = normalizedSafePath(draft, input.path);
    if (!safe.ok) {
        return safe;
    }
    if (!Object.hasOwn(draft.files, safe.data.path)) {
        return failure(draft, 'file_not_found', `No theme file exists at ${safe.data.path}.`);
    }
    const {candidate, data} = await revisedCandidate(draft, (next) => {
        delete next.files[safe.data.path];
        return {path: safe.data.path, deleted: true as const};
    });
    return {ok: true, revision: candidate.revision, data, candidate};
}

function isSafeSearchPattern(pattern: string): boolean {
    let inCharacterClass = false;
    let unboundedQuantifiers = 0;
    let quantifiers = 0;
    for (let index = 0; index < pattern.length; index += 1) {
        const character = pattern[index];
        if (character === '\\') {
            index += 1;
            continue;
        }
        if (character === '[') {
            inCharacterClass = true;
            continue;
        }
        if (character === ']' && inCharacterClass) {
            inCharacterClass = false;
            continue;
        }
        if (inCharacterClass) {
            continue;
        }
        if (character === '(' || character === ')' || character === '{' || character === '}') {
            return false;
        }
        if (character === '*' || character === '+' || character === '?') {
            quantifiers += 1;
            if (character !== '?') {
                unboundedQuantifiers += 1;
            }
            if (quantifiers > 4 || unboundedQuantifiers > 1) {
                return false;
            }
        }
    }
    return !inCharacterClass;
}
