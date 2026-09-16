import {
  ARTIFACT_HTML_MAX_BYTES,
  ArtifactPayloadValidationError,
  cloneArtifactDraft,
  normalizeArtifactPayload,
  withArtifactRevision,
} from './artifact-state';

import type { BuilderToolResult } from '@/builder/core/tool-types';
import type { ArtifactDraft } from './artifact-state';

export const ARTIFACT_HTML_LIMITS = {
  maxBytes: ARTIFACT_HTML_MAX_BYTES,
  maxReadLines: 500,
  maxReadCharacters: 24_000,
  maxMatches: 50,
  maxExcerptCharacters: 300,
  maxQueryCharacters: 256,
  maxReplacements: 1_000,
} as const;

export type ArtifactCandidateResult<T> =
  | { ok: true; revision: string; data: T; candidate: ArtifactDraft }
  | Extract<BuilderToolResult<never>, { ok: false }>;

const encoder = new TextEncoder();

function failure(
  draft: ArtifactDraft,
  code: string,
  message: string,
  retryable = false,
  details?: unknown,
): Extract<BuilderToolResult<never>, { ok: false }> {
  return {
    ok: false,
    revision: draft.revision,
    error: { code, message, retryable, ...(details === undefined ? {} : { details }) },
  };
}

function integer(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback;
}

function currentRevision(draft: ArtifactDraft, revision: unknown): BuilderToolResult<null> {
  return typeof revision === 'string' && revision === draft.revision
    ? { ok: true, revision: draft.revision, data: null }
    : failure(
        draft,
        'stale_revision',
        'The artifact changed since this tool call was prepared. Read the latest HTML and retry.',
        true,
        { currentRevision: draft.revision },
      );
}

function completeDocument(
  draft: ArtifactDraft,
  html: unknown,
): BuilderToolResult<{ html: string; title: string; description: string }> {
  try {
    const normalized = normalizeArtifactPayload({ ...draft, html });
    return {
      ok: true,
      revision: draft.revision,
      data: { html: normalized.html, title: normalized.title, description: normalized.description },
    };
  } catch (error) {
    if (error instanceof ArtifactPayloadValidationError) {
      return failure(draft, error.code, error.message, false, error.details);
    }
    throw error;
  }
}

export function validateArtifactDraft(
  draft: ArtifactDraft,
): BuilderToolResult<{ html: string; title: string; description: string }> {
  return completeDocument(draft, draft.html);
}

async function candidateWithHtml(
  draft: ArtifactDraft,
  html: string,
): Promise<ArtifactCandidateResult<{ title: string; description: string; sizeBytes: number }>> {
  const valid = completeDocument(draft, html);
  if (!valid.ok) {
    return valid;
  }
  const candidate = cloneArtifactDraft(draft);
  candidate.html = valid.data.html;
  candidate.title = valid.data.title;
  candidate.description = valid.data.description;
  candidate.selection = null;
  const revised = await withArtifactRevision(candidate);
  return {
    ok: true,
    revision: revised.revision,
    candidate: revised,
    data: {
      title: revised.title,
      description: revised.description,
      sizeBytes: encoder.encode(revised.html).byteLength,
    },
  };
}

export function readArtifactHtml(
  draft: ArtifactDraft,
  input: Record<string, unknown>,
): BuilderToolResult<unknown> {
  const lines = draft.html.split('\n');
  const hasExplicitEndLine = input.endLine !== undefined;
  const startLine = integer(input.startLine, 1, 1, Math.max(1, lines.length));
  const startColumn = integer(input.startColumn, 1, 1, (lines[startLine - 1]?.length ?? 0) + 1);
  const requestedEnd = integer(
    input.endLine,
    Math.min(lines.length, startLine + ARTIFACT_HTML_LIMITS.maxReadLines - 1),
    startLine,
    lines.length,
  );
  const lineLimit = Math.min(requestedEnd, startLine + ARTIFACT_HTML_LIMITS.maxReadLines - 1);
  const chunks: string[] = [];
  let remaining = ARTIFACT_HTML_LIMITS.maxReadCharacters;
  let endLine = startLine;
  let endColumn = startColumn - 1;
  let next: { startLine: number; startColumn: number } | null = null;
  for (let lineNumber = startLine; lineNumber <= lineLimit; lineNumber += 1) {
    const line = lines[lineNumber - 1] ?? '';
    const column = lineNumber === startLine ? startColumn : 1;
    if (lineNumber > startLine) {
      if (!remaining) {
        next = { startLine: lineNumber, startColumn: 1 };
        break;
      }
      chunks.push('\n');
      remaining -= 1;
    }
    const available = line.slice(column - 1);
    const take = Math.min(remaining, available.length);
    chunks.push(available.slice(0, take));
    remaining -= take;
    endLine = lineNumber;
    endColumn = Math.max(column - 1, column + take - 1);
    if (take < available.length) {
      next = { startLine: lineNumber, startColumn: column + take };
      break;
    }
  }
  if (!next && lineLimit < requestedEnd) {
    next = { startLine: lineLimit + 1, startColumn: 1 };
  } else if (!next && !hasExplicitEndLine && endLine < lines.length) {
    next = { startLine: endLine + 1, startColumn: 1 };
  }
  return {
    ok: true,
    revision: draft.revision,
    data: {
      content: chunks.join(''),
      startLine,
      startColumn,
      endLine,
      endColumn,
      truncated: Boolean(next),
      next,
    },
  };
}

export function findInArtifactHtml(
  draft: ArtifactDraft,
  input: Record<string, unknown>,
): BuilderToolResult<unknown> {
  if (
    typeof input.query !== 'string' ||
    !input.query ||
    input.query.length > ARTIFACT_HTML_LIMITS.maxQueryCharacters
  ) {
    return failure(
      draft,
      'invalid_html_query',
      `Use a non-empty literal query no longer than ${ARTIFACT_HTML_LIMITS.maxQueryCharacters} characters.`,
    );
  }
  const query = input.query.toLocaleLowerCase();
  const matches: Array<{ line: number; column: number; text: string }> = [];
  let totalMatches = 0;
  draft.html.split('\n').forEach((line, index) => {
    const lower = line.toLocaleLowerCase();
    let column = lower.indexOf(query);
    while (column >= 0) {
      totalMatches += 1;
      if (matches.length < ARTIFACT_HTML_LIMITS.maxMatches) {
        matches.push({
          line: index + 1,
          column: column + 1,
          text: line.slice(0, ARTIFACT_HTML_LIMITS.maxExcerptCharacters),
        });
      }
      column = lower.indexOf(query, column + Math.max(1, query.length));
    }
  });
  return {
    ok: true,
    revision: draft.revision,
    data: { query: input.query, matches, totalMatches, truncated: totalMatches > matches.length },
  };
}

export async function replaceInArtifactHtml(
  draft: ArtifactDraft,
  input: Record<string, unknown>,
): Promise<ArtifactCandidateResult<unknown>> {
  const revision = currentRevision(draft, input.revision);
  if (!revision.ok) {
    return revision;
  }
  if (typeof input.oldText !== 'string' || !input.oldText || typeof input.newText !== 'string') {
    return failure(
      draft,
      'invalid_html_replacement',
      'Provide non-empty oldText and string newText values.',
    );
  }
  const oldText = input.oldText;
  const newText = input.newText;
  const positions: number[] = [];
  let cursor = 0;
  while (positions.length <= ARTIFACT_HTML_LIMITS.maxReplacements) {
    const position = draft.html.indexOf(oldText, cursor);
    if (position < 0) {
      break;
    }
    positions.push(position);
    if (input.replaceAll !== true && positions.length > 1) {
      break;
    }
    cursor = position + oldText.length;
  }
  const occurrences = positions.length;
  if (!occurrences) {
    return failure(
      draft,
      'html_text_not_found',
      'The requested HTML text was not found. Read the latest HTML and retry.',
      true,
    );
  }
  if (occurrences > 1 && input.replaceAll !== true) {
    return failure(
      draft,
      'html_text_not_unique',
      'The requested HTML text appears more than once. Provide more context or set replaceAll to true.',
      true,
      { occurrences },
    );
  }
  if (input.replaceAll === true && occurrences > ARTIFACT_HTML_LIMITS.maxReplacements) {
    return failure(
      draft,
      'too_many_html_replacements',
      `One call can replace at most ${ARTIFACT_HTML_LIMITS.maxReplacements} matches. Use a more specific match or write the complete HTML document.`,
      true,
    );
  }
  const replacementCount = input.replaceAll === true ? occurrences : 1;
  const projectedSizeBytes =
    encoder.encode(draft.html).byteLength +
    replacementCount * (encoder.encode(newText).byteLength - encoder.encode(oldText).byteLength);
  if (projectedSizeBytes > ARTIFACT_HTML_LIMITS.maxBytes) {
    return failure(
      draft,
      'artifact_html_too_large',
      `Artifact HTML must stay under ${ARTIFACT_HTML_LIMITS.maxBytes} bytes.`,
      false,
      { sizeBytes: projectedSizeBytes },
    );
  }
  let html: string;
  if (input.replaceAll === true) {
    const chunks: string[] = [];
    let start = 0;
    positions.forEach((position) => {
      chunks.push(draft.html.slice(start, position), newText);
      start = position + oldText.length;
    });
    chunks.push(draft.html.slice(start));
    html = chunks.join('');
  } else {
    const position = positions[0];
    html = `${draft.html.slice(0, position)}${newText}${draft.html.slice(position + oldText.length)}`;
  }
  const result = await candidateWithHtml(draft, html);
  return result.ok
    ? { ...result, data: { ...result.data, replacements: replacementCount } }
    : result;
}

export async function writeArtifactHtml(
  draft: ArtifactDraft,
  input: Record<string, unknown>,
): Promise<ArtifactCandidateResult<unknown>> {
  const revision = currentRevision(draft, input.revision);
  if (!revision.ok) {
    return revision;
  }
  return candidateWithHtml(draft, input.html as string);
}
