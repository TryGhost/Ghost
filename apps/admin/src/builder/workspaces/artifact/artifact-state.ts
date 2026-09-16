import type { BuilderSelectionContext } from '@/builder/core/workspace';

export type ArtifactPayload = {
  id: string;
  artifactVersion: number;
  title: string;
  description: string;
  html: string;
};

export type ArtifactDraft = ArtifactPayload & {
  revision: string;
  selection: BuilderSelectionContext | null;
};

export const ARTIFACT_HTML_MAX_BYTES = 5 * 1024 * 1024;

const starterDocument = `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Untitled artifact</title>
</head>
<body>
    <main id="app"></main>
</body>
</html>`;

export function artifactBuilderPayload(payload: ArtifactPayload): ArtifactPayload {
  return payload.html.trim()
    ? payload
    : {
        ...payload,
        title: 'Untitled artifact',
        description: '',
        html: starterDocument,
      };
}

export class ArtifactPayloadValidationError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ArtifactPayloadValidationError';
    this.code = code;
    this.details = details;
  }
}

export function normalizeArtifactPayload(value: unknown): ArtifactPayload {
  if (!value || typeof value !== 'object') {
    throw new ArtifactPayloadValidationError(
      'invalid_artifact_payload',
      'The artifact payload is invalid.',
    );
  }
  const payload = value as Partial<ArtifactPayload>;
  if (
    typeof payload.id !== 'string' ||
    !payload.id.trim() ||
    payload.id.length > 256 ||
    payload.artifactVersion !== 1 ||
    typeof payload.title !== 'string' ||
    payload.title.length > 200 ||
    typeof payload.description !== 'string' ||
    payload.description.length > 500
  ) {
    throw new ArtifactPayloadValidationError(
      'invalid_artifact_payload',
      'The artifact needs bounded metadata, a stable ID, and a supported artifact version.',
    );
  }
  if (typeof payload.html !== 'string') {
    throw new ArtifactPayloadValidationError(
      'invalid_artifact_html',
      'Artifact HTML must be a string.',
    );
  }
  if (payload.html.length > ARTIFACT_HTML_MAX_BYTES) {
    throw new ArtifactPayloadValidationError(
      'artifact_html_too_large',
      `Artifact HTML must stay under ${ARTIFACT_HTML_MAX_BYTES} bytes.`,
      { sizeBytes: payload.html.length },
    );
  }
  const sizeBytes = new TextEncoder().encode(payload.html).byteLength;
  if (sizeBytes > ARTIFACT_HTML_MAX_BYTES) {
    throw new ArtifactPayloadValidationError(
      'artifact_html_too_large',
      `Artifact HTML must stay under ${ARTIFACT_HTML_MAX_BYTES} bytes.`,
      { sizeBytes },
    );
  }
  if (
    !/^\s*<!doctype\s+html\b/i.test(payload.html) ||
    !/<html\b/i.test(payload.html) ||
    !/<head\b/i.test(payload.html) ||
    !/<body\b/i.test(payload.html)
  ) {
    throw new ArtifactPayloadValidationError(
      'incomplete_artifact_html',
      'Write one complete HTML document with a doctype, html, head, and body.',
    );
  }
  const parsed = new DOMParser().parseFromString(payload.html, 'text/html');
  const title = parsed.title.trim().slice(0, 200);
  if (!title) {
    throw new ArtifactPayloadValidationError(
      'artifact_title_required',
      'The HTML document needs a non-empty title element so the saved artifact has a title.',
    );
  }
  const description = (
    parsed.querySelector('meta[name="description" i]')?.getAttribute('content') ?? ''
  )
    .trim()
    .slice(0, 500);
  return { id: payload.id, artifactVersion: 1, title, description, html: payload.html };
}

function clonePayload(payload: ArtifactPayload): ArtifactPayload {
  return {
    id: payload.id,
    artifactVersion: payload.artifactVersion,
    title: payload.title,
    description: payload.description,
    html: payload.html,
  };
}

export function cloneArtifactDraft(draft: ArtifactDraft): ArtifactDraft {
  return structuredClone(draft);
}

export function artifactPayload(draft: ArtifactDraft): ArtifactPayload {
  return clonePayload(draft);
}

async function hashArtifact(draft: Omit<ArtifactDraft, 'revision'>): Promise<string> {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      id: draft.id,
      artifactVersion: draft.artifactVersion,
      title: draft.title,
      description: draft.description,
      html: draft.html,
      selection: draft.selection,
    }),
  );
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `artifact-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function withArtifactRevision(
  draft: Omit<ArtifactDraft, 'revision'> | ArtifactDraft,
): Promise<ArtifactDraft> {
  const value = draft as ArtifactDraft;
  const next = structuredClone({
    id: value.id,
    artifactVersion: value.artifactVersion,
    title: value.title,
    description: value.description,
    html: value.html,
    selection: value.selection,
  });
  return { ...next, revision: await hashArtifact(next) };
}

export async function createArtifactDraft(payload: ArtifactPayload): Promise<ArtifactDraft> {
  return withArtifactRevision({ ...normalizeArtifactPayload(payload), selection: null });
}

export async function withArtifactSelection(
  draft: ArtifactDraft,
  selection: BuilderSelectionContext | null,
): Promise<ArtifactDraft> {
  return withArtifactRevision({
    ...cloneArtifactDraft(draft),
    selection: structuredClone(selection),
  });
}
