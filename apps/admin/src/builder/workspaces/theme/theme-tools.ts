import {
  THEME_EDITOR_ARCHIVE_LIMITS,
  isEditablePath,
  normaliseRelativePath,
} from '@tryghost/theme-renderer/editor/archive';
import { applyAttributeEdits, applyTextEdit } from '@tryghost/theme-renderer/editor';
import { parseEditMarker } from '@tryghost/theme-renderer/markers';

import { cloneThemeDraft, withThemeRevision } from './theme-state';

import type { BuilderToolResult } from '@/builder/core/tool-types';
import type { ThemeDraft, ThemeFile } from './theme-state';

export const THEME_TEXT_LIMITS = {
  maxFileBytes: 2 * 1024 * 1024,
  maxTotalBytes: 16 * 1024 * 1024,
  maxReadLines: 500,
  maxReadCharacters: 16 * 1024,
  maxSearchMatches: 100,
  maxSearchLineCharacters: 500,
  maxSearchScannedCharacters: 2 * 1024 * 1024,
  maxSearchPatternCharacters: 256,
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
  | { ok: true; revision: string; data: T; candidate: ThemeDraft }
  | Extract<BuilderToolResult<never>, { ok: false }>;

type ToolFailure = Extract<BuilderToolResult<never>, { ok: false }>;

type MutationInput = {
  revision: string;
  path: string;
};

export type ThemeInlineTextEditInput = {
  revision: string;
  marker: string;
  tagName: string;
  newText: string;
};

export type ThemeInlineImageEditInput = {
  revision: string;
  marker: string;
  tagName: string;
  fileName: string;
  mediaType: string;
  data: Uint8Array;
};

const inlineImageTypes: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const maxInlineImageBytes = 5 * 1024 * 1024;
const maxInlineImageDimension = 16_384;
const maxInlineImagePixels = 64 * 1024 * 1024;

function inlineImageDimensions(
  mediaType: string,
  data: Uint8Array,
): { width: number; height: number } | null {
  if (
    mediaType === 'image/png' &&
    data.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => data[index] === byte)
  ) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (
    mediaType === 'image/gif' &&
    data.length >= 10 &&
    String.fromCharCode(...data.slice(0, 6))?.match(/^GIF8[79]a$/)
  ) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (mediaType === 'image/jpeg' && data.length >= 10 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 8 < data.length) {
      if (data[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = data[offset + 1];
      const length = (data[offset + 2] << 8) | data[offset + 3];
      if (length < 2 || offset + length + 2 > data.length) {
        return null;
      }
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      ) {
        return {
          height: (data[offset + 5] << 8) | data[offset + 6],
          width: (data[offset + 7] << 8) | data[offset + 8],
        };
      }
      offset += length + 2;
    }
    return null;
  }
  if (
    mediaType === 'image/webp' &&
    data.length >= 25 &&
    String.fromCharCode(...data.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...data.slice(8, 12)) === 'WEBP'
  ) {
    const chunk = String.fromCharCode(...data.slice(12, 16));
    if (chunk === 'VP8X' && data.length >= 30) {
      return {
        width: 1 + data[24] + (data[25] << 8) + (data[26] << 16),
        height: 1 + data[27] + (data[28] << 8) + (data[29] << 16),
      };
    }
    if (
      chunk === 'VP8 ' &&
      data.length >= 30 &&
      data[23] === 0x9d &&
      data[24] === 0x01 &&
      data[25] === 0x2a
    ) {
      return {
        width: (data[26] | (data[27] << 8)) & 0x3fff,
        height: (data[28] | (data[29] << 8)) & 0x3fff,
      };
    }
    if (chunk === 'VP8L' && data[20] === 0x2f) {
      return {
        width: 1 + data[21] + ((data[22] & 0x3f) << 8),
        height: 1 + ((data[22] & 0xc0) >> 6) + (data[23] << 2) + ((data[24] & 0x0f) << 10),
      };
    }
  }
  return null;
}

const encoder = new TextEncoder();

function failure(
  draft: ThemeDraft,
  code: string,
  message: string,
  retryable = false,
  details?: unknown,
): ToolFailure {
  return {
    ok: false,
    revision: draft.revision,
    error: { code, message, retryable, ...(details === undefined ? {} : { details }) },
  };
}

function normalizedSafePath(draft: ThemeDraft, path: unknown): BuilderToolResult<{ path: string }> {
  if (
    typeof path !== 'string' ||
    !path ||
    path.includes('\0') ||
    path.includes('\\') ||
    path.startsWith('/') ||
    /^[A-Za-z]:\//.test(path)
  ) {
    return failure(
      draft,
      'unsafe_path',
      'Use a non-empty path relative to the theme root, with forward slashes only.',
    );
  }
  const segments = path.split('/');
  if (
    segments.some((segment) => !segment || segment === '.' || segment === '..') ||
    normaliseRelativePath(path) !== path
  ) {
    return failure(
      draft,
      'unsafe_path',
      'The file path must stay inside the theme root and must not contain traversal segments.',
    );
  }
  return { ok: true, revision: draft.revision, data: { path } };
}

function currentRevision(draft: ThemeDraft, revision: unknown): BuilderToolResult<null> {
  if (typeof revision !== 'string' || revision !== draft.revision) {
    return failure(
      draft,
      'stale_revision',
      'The theme changed since this tool call was prepared. Read the latest revision and retry.',
      true,
      { currentRevision: draft.revision },
    );
  }
  return { ok: true, revision: draft.revision, data: null };
}

function textFile(
  draft: ThemeDraft,
  path: unknown,
): BuilderToolResult<{ path: string; file: ThemeFile & { kind: 'text'; content: string } }> {
  const safe = normalizedSafePath(draft, path);
  if (!safe.ok) {
    return safe;
  }
  const file = Object.hasOwn(draft.files, safe.data.path) ? draft.files[safe.data.path] : undefined;
  if (!file) {
    return failure(draft, 'file_not_found', `No theme file exists at ${safe.data.path}.`);
  }
  if (file.kind !== 'text' || file.content === null) {
    return failure(
      draft,
      'binary_file',
      `${safe.data.path} is a binary file and cannot be read or written as text.`,
    );
  }
  return {
    ok: true,
    revision: draft.revision,
    data: { path: safe.data.path, file: file as ThemeFile & { kind: 'text'; content: string } },
  };
}

function referencedStylesheets(draft: ThemeDraft): Set<string> {
  const references = new Set<string>();
  const addReference = (reference: string, assetHelper = false) => {
    const clean = reference.split(/[?#]/, 1)[0];
    const path = assetHelper
      ? `assets/${clean.replace(/^\/?assets\//, '')}`
      : clean.replace(/^\/?assets\//, 'assets/');
    if (path.startsWith('assets/') && path.endsWith('.css')) {
      references.add(path);
    }
  };

  Object.values(draft.files).forEach((file) => {
    if (file.kind !== 'text' || file.content === null || !file.path.endsWith('.hbs')) {
      return;
    }
    const template = file.content
      .replace(/<!--[^]*?-->/g, '')
      .replace(/\{\{!--[^]*?--\}\}/g, '')
      .replace(/\{\{![^]*?\}\}/g, '');
    for (const link of template.matchAll(/<link\b[^>]*>/gi)) {
      if (!/\brel\s*=\s*(?:["'][^"']*\bstylesheet\b[^"']*["']|stylesheet\b)/i.test(link[0])) {
        continue;
      }
      for (const match of link[0].matchAll(
        /\{\{\s*asset\s+["']([^"']+\.css(?:[?#][^"']*)?)["']/gi,
      )) {
        addReference(match[1], true);
      }
      for (const match of link[0].matchAll(/["'](\/?assets\/[^"']+\.css(?:[?#][^"']*)?)["']/gi)) {
        addReference(match[1]);
      }
    }
  });
  return references;
}

function importedStylesheets(draft: ThemeDraft, path: string): string[] {
  const file = Object.hasOwn(draft.files, path) ? draft.files[path] : undefined;
  if (!file || file.kind !== 'text' || file.content === null) {
    return [];
  }
  const directory = path.slice(0, Math.max(0, path.lastIndexOf('/') + 1));
  const imports: string[] = [];
  const css = file.content.replace(/\/\*[^]*?\*\//g, '');
  const importPattern =
    /@import\s+(?:url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)|"([^"]+)"|'([^']+)')/gi;
  for (const match of css.matchAll(importPattern)) {
    const matchedReference = match.slice(1).find((value) => value !== undefined);
    if (!matchedReference) {
      continue;
    }
    const reference = matchedReference.split(/[?#]/, 1)[0];
    if (!reference.toLowerCase().endsWith('.css')) {
      continue;
    }
    if (/^(?:[a-z]+:|\/\/|\/)/i.test(reference)) {
      continue;
    }
    const segments = `${directory}${reference}`.split('/');
    const normalized: string[] = [];
    for (const segment of segments) {
      if (segment === '..') {
        normalized.pop();
      } else if (segment && segment !== '.') {
        normalized.push(segment);
      }
    }
    imports.push(normalized.join('/'));
  }
  return imports;
}

function sourceFeedsStylesheet(
  draft: ThemeDraft,
  sourcePath: string,
  entryPath: string,
  visited = new Set<string>(),
): boolean {
  if (sourcePath === entryPath) {
    return true;
  }
  if (visited.has(entryPath)) {
    return false;
  }
  visited.add(entryPath);
  return importedStylesheets(draft, entryPath).some((path) =>
    sourceFeedsStylesheet(draft, sourcePath, path, visited),
  );
}

function uncompiledStylesheetFailure(draft: ThemeDraft, path: string): ToolFailure | null {
  if (!path.startsWith('assets/css/') || !path.endsWith('.css')) {
    return null;
  }
  const references = referencedStylesheets(draft);
  if ([...references].some((renderedPath) => sourceFeedsStylesheet(draft, path, renderedPath))) {
    return null;
  }
  const renderedPaths = [...references]
    .filter((renderedPath) => {
      if (!renderedPath.startsWith('assets/built/')) {
        return false;
      }
      const sourceEntry = `assets/css/${renderedPath.slice('assets/built/'.length)}`;
      return sourceFeedsStylesheet(draft, path, sourceEntry);
    })
    .sort();
  if (!renderedPaths.length) {
    return null;
  }
  return failure(
    draft,
    'uncompiled_theme_asset',
    `${path} is authoring source and is not loaded by the rendered theme. This browser Builder does not run theme-specific build scripts. Apply the equivalent change to ${renderedPaths.join(', ')} and verify the preview before finishing.`,
    false,
    { sourcePath: path, renderedPaths },
  );
}

function validateTextSize(
  draft: ThemeDraft,
  path: string,
  content: string,
): BuilderToolResult<null> {
  const fileBytes = encoder.encode(content).byteLength;
  if (fileBytes > THEME_TEXT_LIMITS.maxFileBytes) {
    return failure(
      draft,
      'file_too_large',
      `Text files must stay under ${THEME_TEXT_LIMITS.maxFileBytes} bytes.`,
      false,
      { path, sizeBytes: fileBytes },
    );
  }
  const totalBytes = Object.entries(draft.files).reduce((total, [candidatePath, file]) => {
    if (candidatePath === path || file.kind !== 'text' || file.content === null) {
      return total;
    }
    return total + encoder.encode(file.content).byteLength;
  }, fileBytes);
  if (totalBytes > THEME_TEXT_LIMITS.maxTotalBytes) {
    return failure(
      draft,
      'theme_text_too_large',
      `Theme text must stay under ${THEME_TEXT_LIMITS.maxTotalBytes} bytes.`,
      false,
      { sizeBytes: totalBytes },
    );
  }
  return { ok: true, revision: draft.revision, data: null };
}

async function revisedCandidate<T>(
  draft: ThemeDraft,
  update: (candidate: ThemeDraft) => T,
): Promise<{ candidate: ThemeDraft; data: T }> {
  const candidate = cloneThemeDraft(draft);
  const data = update(candidate);
  return { candidate: await withThemeRevision(candidate), data };
}

export function listThemeFiles(
  draft: ThemeDraft,
): BuilderToolResult<{ files: ThemeFileSummary[] }> {
  const files = Object.keys(draft.files)
    .sort()
    .map((path): ThemeFileSummary => {
      const file = draft.files[path];
      return {
        path,
        kind: file.kind,
        sizeBytes:
          file.kind === 'text'
            ? encoder.encode(file.content ?? '').byteLength
            : (file.binary?.byteLength ?? 0),
      };
    });
  return { ok: true, revision: draft.revision, data: { files } };
}

export async function editThemeTextAtMarker(
  draft: ThemeDraft,
  input: ThemeInlineTextEditInput,
): Promise<ThemeCandidateResult<{ path: string; marker: string }>> {
  const revision = currentRevision(draft, input.revision);
  if (!revision.ok) {
    return revision;
  }
  if (typeof input.marker !== 'string' || input.marker.length === 0 || input.marker.length > 512) {
    return failure(
      draft,
      'invalid_source_marker',
      'Inline edits require a bounded source marker from the current preview.',
    );
  }
  const marker = parseEditMarker(input.marker);
  if (
    !marker ||
    !marker.file ||
    !Number.isSafeInteger(marker.line) ||
    marker.line < 1 ||
    !Number.isSafeInteger(marker.column) ||
    marker.column < 1
  ) {
    return failure(
      draft,
      'invalid_source_marker',
      'The preview source marker is invalid. Select the rendered element again and retry.',
    );
  }
  if (
    typeof input.tagName !== 'string' ||
    !/^[a-z][a-z0-9-]*$/i.test(input.tagName) ||
    input.tagName.length > 64
  ) {
    return failure(draft, 'invalid_inline_edit', 'The preview element tag is invalid.');
  }
  if (typeof input.newText !== 'string' || input.newText.length > 4_096) {
    return failure(
      draft,
      'invalid_inline_edit',
      'Inline text must be a string under 4096 characters.',
    );
  }
  const resolved = textFile(draft, marker.file);
  if (!resolved.ok) {
    return resolved;
  }
  let content: string;
  try {
    content = applyTextEdit(
      resolved.data.file.content,
      { line: marker.line, column: marker.column },
      input.newText,
      { tagName: input.tagName },
    );
  } catch (error) {
    return failure(
      draft,
      'inline_edit_unavailable',
      error instanceof Error
        ? error.message
        : 'This rendered text cannot be edited at its current source marker.',
    );
  }
  const size = validateTextSize(draft, resolved.data.path, content);
  if (!size.ok) {
    return size;
  }
  const { candidate } = await revisedCandidate(draft, (next) => {
    next.files[resolved.data.path] = { ...resolved.data.file, content };
  });
  return {
    ok: true,
    revision: candidate.revision,
    candidate,
    data: { path: resolved.data.path, marker: input.marker },
  };
}

export async function editThemeImageAtMarker(
  draft: ThemeDraft,
  input: ThemeInlineImageEditInput,
): Promise<ThemeCandidateResult<{ path: string; marker: string; assetPath: string }>> {
  const revision = currentRevision(draft, input.revision);
  if (!revision.ok) {
    return revision;
  }
  const marker =
    typeof input.marker === 'string' && input.marker.length <= 512
      ? parseEditMarker(input.marker)
      : null;
  if (
    !marker ||
    !marker.file ||
    !Number.isSafeInteger(marker.line) ||
    marker.line < 1 ||
    !Number.isSafeInteger(marker.column) ||
    marker.column < 1
  ) {
    return failure(
      draft,
      'invalid_source_marker',
      'The preview source marker is invalid. Select the rendered image again and retry.',
    );
  }
  if (input.tagName.toLowerCase() !== 'img') {
    return failure(
      draft,
      'invalid_inline_image',
      'Inline image replacement requires a rendered img element.',
    );
  }
  const extension = inlineImageTypes[input.mediaType];
  const dimensions =
    extension && input.data instanceof Uint8Array
      ? inlineImageDimensions(input.mediaType, input.data)
      : null;
  if (
    !extension ||
    !(input.data instanceof Uint8Array) ||
    input.data.byteLength === 0 ||
    input.data.byteLength > maxInlineImageBytes ||
    !dimensions ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > maxInlineImageDimension ||
    dimensions.height > maxInlineImageDimension ||
    dimensions.width * dimensions.height > maxInlineImagePixels
  ) {
    return failure(
      draft,
      'invalid_inline_image',
      `Use a GIF, JPEG, PNG, or WebP image under ${maxInlineImageBytes} bytes.`,
    );
  }
  const resolved = textFile(draft, marker.file);
  if (!resolved.ok) {
    return resolved;
  }
  const originalBase =
    input.fileName
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/\.[^.]*$/, '') ?? '';
  const safeBase =
    originalBase
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'image';
  let assetPath = `assets/images/builder/${safeBase}.${extension}`;
  for (let suffix = 2; Object.hasOwn(draft.files, assetPath); suffix += 1) {
    assetPath = `assets/images/builder/${safeBase}-${suffix}.${extension}`;
  }
  if (Object.keys(draft.files).length + 1 > THEME_EDITOR_ARCHIVE_LIMITS.maxFiles) {
    return failure(
      draft,
      'theme_too_many_files',
      `Themes must stay under ${THEME_EDITOR_ARCHIVE_LIMITS.maxFiles} files.`,
    );
  }
  let content: string;
  try {
    const placeholder = `ghost-builder-${safeBase}-${extension}`;
    const edited = applyAttributeEdits(
      resolved.data.file.content,
      { line: marker.line, column: marker.column },
      [
        { name: 'src', value: placeholder },
        { name: 'srcset', value: null, optional: true },
        { name: 'sizes', value: null, optional: true },
      ],
      { tagName: 'img' },
    ).source;
    const assetHelper = `src="{{asset "${assetPath.slice('assets/'.length)}"}}"`;
    content = edited.replace(`src="${placeholder}"`, assetHelper);
  } catch (error) {
    return failure(
      draft,
      'inline_edit_unavailable',
      error instanceof Error
        ? error.message
        : 'This rendered image cannot be edited at its current source marker.',
    );
  }
  const size = validateTextSize(draft, resolved.data.path, content);
  if (!size.ok) {
    return size;
  }
  const currentBytes = Object.values(draft.files).reduce(
    (total, file) =>
      total +
      (file.kind === 'text'
        ? encoder.encode(file.content ?? '').byteLength
        : (file.binary?.byteLength ?? 0)),
    0,
  );
  const projectedBytes =
    currentBytes -
    encoder.encode(resolved.data.file.content).byteLength +
    encoder.encode(content).byteLength +
    input.data.byteLength;
  if (projectedBytes > THEME_EDITOR_ARCHIVE_LIMITS.maxExtractedBytes) {
    return failure(
      draft,
      'theme_too_large',
      `Theme files must stay under ${THEME_EDITOR_ARCHIVE_LIMITS.maxExtractedBytes} bytes.`,
    );
  }
  const { candidate } = await revisedCandidate(draft, (next) => {
    next.files[resolved.data.path] = { ...resolved.data.file, content };
    next.files[assetPath] = {
      path: assetPath,
      kind: 'binary',
      content: null,
      binary: new Uint8Array(input.data),
      unixPermissions: null,
      dosPermissions: null,
    };
  });
  return {
    ok: true,
    revision: candidate.revision,
    candidate,
    data: { path: resolved.data.path, marker: input.marker, assetPath },
  };
}

export function searchThemeFiles(
  draft: ThemeDraft,
  input: { query?: unknown; regex?: unknown },
): BuilderToolResult<{ matches: ThemeSearchMatch[]; truncated: boolean }> {
  if (typeof input.query !== 'string' || !input.query) {
    return failure(draft, 'invalid_search_query', 'Provide a non-empty text search query.');
  }
  if (input.query.length > THEME_TEXT_LIMITS.maxSearchPatternCharacters) {
    return failure(
      draft,
      'search_pattern_too_large',
      `Search queries must stay under ${THEME_TEXT_LIMITS.maxSearchPatternCharacters} characters.`,
    );
  }
  let expression: RegExp;
  try {
    expression =
      input.regex === true
        ? new RegExp(input.query, 'g')
        : new RegExp(input.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  } catch {
    return failure(
      draft,
      'invalid_search_pattern',
      'The regular-expression search query is invalid.',
    );
  }
  if (input.regex === true && !isSafeSearchPattern(input.query)) {
    return failure(
      draft,
      'unsafe_search_pattern',
      'This regular expression can cause excessive backtracking. Use no groups or counted repetitions, and at most one unbounded quantifier.',
    );
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
        return { ok: true, revision: draft.revision, data: { matches, truncated: true } };
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
          return { ok: true, revision: draft.revision, data: { matches, truncated } };
        }
        matches.push({
          path,
          line: lineIndex + 1,
          column: match.index + 1,
          text: line.slice(0, THEME_TEXT_LIMITS.maxSearchLineCharacters),
        });
        if (match[0].length === 0) {
          expression.lastIndex += 1;
        }
        match = expression.exec(searchable);
      }
    }
  }
  return { ok: true, revision: draft.revision, data: { matches, truncated } };
}

export function readThemeFile(
  draft: ThemeDraft,
  input: { path?: unknown; startLine?: unknown; endLine?: unknown; startColumn?: unknown },
): BuilderToolResult<{
  path: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  totalLines: number;
  content: string;
  truncated: boolean;
  next: { line: number; column: number } | null;
}> {
  const resolved = textFile(draft, input.path);
  if (!resolved.ok) {
    return resolved;
  }
  const lines = resolved.data.file.content.split('\n');
  const startLine = input.startLine === undefined ? 1 : input.startLine;
  const startColumn = input.startColumn === undefined ? 1 : input.startColumn;
  const requestedEnd =
    input.endLine === undefined
      ? Math.min(lines.length, Number(startLine) + THEME_TEXT_LIMITS.maxReadLines - 1)
      : input.endLine;
  if (
    !Number.isInteger(startLine) ||
    !Number.isInteger(startColumn) ||
    !Number.isInteger(requestedEnd) ||
    Number(startLine) < 1 ||
    Number(startColumn) < 1 ||
    Number(requestedEnd) < Number(startLine)
  ) {
    return failure(
      draft,
      'invalid_line_range',
      'Line ranges use positive, inclusive line numbers.',
    );
  }
  const endLine = Math.min(
    Number(requestedEnd),
    lines.length,
    Number(startLine) + THEME_TEXT_LIMITS.maxReadLines - 1,
  );
  if (Number(startLine) > lines.length) {
    return failure(
      draft,
      'invalid_line_range',
      `${resolved.data.path} has only ${lines.length} lines.`,
    );
  }
  if (Number(startColumn) > lines[Number(startLine) - 1].length + 1) {
    return failure(
      draft,
      'invalid_line_range',
      `Line ${Number(startLine)} has only ${lines[Number(startLine) - 1].length} characters.`,
    );
  }
  const chunks: string[] = [];
  let remaining = THEME_TEXT_LIMITS.maxReadCharacters;
  let next: { line: number; column: number } | null = null;
  for (let lineNumber = Number(startLine); lineNumber <= endLine; lineNumber += 1) {
    const column = lineNumber === Number(startLine) ? Number(startColumn) : 1;
    const prefix = `${lineNumber}: `;
    const line = lines[lineNumber - 1].slice(column - 1);
    const separatorLength = chunks.length ? 1 : 0;
    const available = remaining - prefix.length - separatorLength;
    if (available <= 0) {
      next = { line: lineNumber, column };
      break;
    }
    const visible = line.slice(0, available);
    chunks.push(`${prefix}${visible}`);
    remaining -= prefix.length + visible.length + separatorLength;
    if (visible.length < line.length) {
      next = { line: lineNumber, column: column + visible.length };
      break;
    }
  }
  const requestedEndInFile = Math.min(Number(requestedEnd), lines.length);
  if (
    !next &&
    (endLine < requestedEndInFile || (endLine < lines.length && input.endLine === undefined))
  ) {
    next = { line: endLine + 1, column: 1 };
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
      next,
    },
  };
}

export async function replaceInThemeFile(
  draft: ThemeDraft,
  input: MutationInput & { oldText: unknown; newText: unknown },
): Promise<ThemeCandidateResult<{ path: string; replacements: 1 }>> {
  const revision = currentRevision(draft, input.revision);
  if (!revision.ok) {
    return revision;
  }
  const resolved = textFile(draft, input.path);
  if (!resolved.ok) {
    return resolved;
  }
  const uncompiled = uncompiledStylesheetFailure(draft, resolved.data.path);
  if (uncompiled) {
    return uncompiled;
  }
  if (typeof input.oldText !== 'string' || !input.oldText || typeof input.newText !== 'string') {
    return failure(
      draft,
      'invalid_replacement',
      'Provide non-empty oldText and string newText values.',
    );
  }
  const first = resolved.data.file.content.indexOf(input.oldText);
  if (first === -1) {
    return failure(
      draft,
      'replacement_not_found',
      `The exact text was not found in ${resolved.data.path}. Read the latest file and retry.`,
    );
  }
  if (resolved.data.file.content.indexOf(input.oldText, first + input.oldText.length) !== -1) {
    return failure(
      draft,
      'replacement_ambiguous',
      `The exact text appears more than once in ${resolved.data.path}. Include more surrounding text.`,
    );
  }
  const content = `${resolved.data.file.content.slice(0, first)}${input.newText}${resolved.data.file.content.slice(first + input.oldText.length)}`;
  const size = validateTextSize(draft, resolved.data.path, content);
  if (!size.ok) {
    return size;
  }
  const { candidate, data } = await revisedCandidate(draft, (next) => {
    next.files[resolved.data.path].content = content;
    return { path: resolved.data.path, replacements: 1 as const };
  });
  return { ok: true, revision: candidate.revision, data, candidate };
}

export async function writeThemeFile(
  draft: ThemeDraft,
  input: MutationInput & { content: unknown },
): Promise<ThemeCandidateResult<{ path: string; created: boolean }>> {
  const revision = currentRevision(draft, input.revision);
  if (!revision.ok) {
    return revision;
  }
  const safe = normalizedSafePath(draft, input.path);
  if (!safe.ok) {
    return safe;
  }
  const uncompiled = uncompiledStylesheetFailure(draft, safe.data.path);
  if (uncompiled) {
    return uncompiled;
  }
  if (typeof input.content !== 'string') {
    return failure(draft, 'invalid_file_content', 'File content must be text.');
  }
  const existing = Object.hasOwn(draft.files, safe.data.path)
    ? draft.files[safe.data.path]
    : undefined;
  if (existing?.kind === 'binary') {
    return failure(
      draft,
      'binary_file',
      `${safe.data.path} is a binary file and cannot be replaced with text.`,
    );
  }
  if (!existing && !isEditablePath(safe.data.path)) {
    return failure(
      draft,
      'binary_file',
      `${safe.data.path} is classified as a binary file. Builder v1 can only create text-file paths.`,
    );
  }
  if (!existing && Object.keys(draft.files).length >= THEME_EDITOR_ARCHIVE_LIMITS.maxFiles) {
    return failure(
      draft,
      'too_many_files',
      `Themes can contain at most ${THEME_EDITOR_ARCHIVE_LIMITS.maxFiles} files.`,
    );
  }
  const size = validateTextSize(draft, safe.data.path, input.content);
  if (!size.ok) {
    return size;
  }
  const created = !existing;
  const { candidate, data } = await revisedCandidate(draft, (next) => {
    const file: ThemeFile = existing
      ? { ...existing, content: input.content as string }
      : {
          path: safe.data.path,
          kind: 'text',
          content: input.content as string,
          binary: null,
          unixPermissions: null,
          dosPermissions: null,
        };
    next.files = { ...next.files, [safe.data.path]: file };
    return { path: safe.data.path, created };
  });
  return { ok: true, revision: candidate.revision, data, candidate };
}

export async function deleteThemeFile(
  draft: ThemeDraft,
  input: MutationInput,
): Promise<ThemeCandidateResult<{ path: string; deleted: true }>> {
  const revision = currentRevision(draft, input.revision);
  if (!revision.ok) {
    return revision;
  }
  const safe = normalizedSafePath(draft, input.path);
  if (!safe.ok) {
    return safe;
  }
  const uncompiled = uncompiledStylesheetFailure(draft, safe.data.path);
  if (uncompiled) {
    return uncompiled;
  }
  if (!Object.hasOwn(draft.files, safe.data.path)) {
    return failure(draft, 'file_not_found', `No theme file exists at ${safe.data.path}.`);
  }
  const { candidate, data } = await revisedCandidate(draft, (next) => {
    delete next.files[safe.data.path];
    return { path: safe.data.path, deleted: true as const };
  });
  return { ok: true, revision: candidate.revision, data, candidate };
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
