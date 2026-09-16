import type { BuilderToolDefinition, BuilderToolResult } from './tool-types';

export type BuilderAttachmentSummary = {
  id: string;
  name: string;
  kind: 'text' | 'image';
  mediaType: string;
  size: number;
  preview?: string;
  url?: string;
};

export type BuilderAttachmentError = {
  name: string;
  code:
    | 'attachment_too_large'
    | 'attachment_limit_reached'
    | 'attachment_session_limit_reached'
    | 'unsupported_attachment_type'
    | 'attachment_upload_failed';
  message: string;
};

type TextAttachmentSnapshot = Readonly<
  BuilderAttachmentSummary & { kind: 'text'; content: string }
>;
type ImageAttachmentSnapshot = Readonly<
  BuilderAttachmentSummary & { kind: 'image'; url: string; data: string; source?: string }
>;

export type BuilderAttachmentSnapshot = Readonly<{
  version: 1;
  attachments: ReadonlyArray<TextAttachmentSnapshot | ImageAttachmentSnapshot>;
}>;

type StoredAttachment = TextAttachmentSnapshot | ImageAttachmentSnapshot;

type BuilderAttachmentsOptions = {
  uploadImage: (file: File) => Promise<string>;
  maxFileBytes?: number;
  maxAttachments?: number;
  maxRetainedBytes?: number;
};

const defaultMaxFileBytes = 5 * 1024 * 1024;
const defaultMaxAttachments = 10;
const previewCharacters = 2_000;
const maxReadLines = 500;
const maxReadCharacters = 24_000;
const maxSearchResults = 50;
const maxSearchExcerptCharacters = 300;
const maxSearchQueryCharacters = 256;

const imageTypes = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']);
const imageExtensions = new Map([
  ['gif', 'image/gif'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['svg', 'image/svg+xml'],
  ['webp', 'image/webp'],
]);
const textTypes = new Set(['application/json', 'text/csv', 'text/plain', 'text/markdown']);
const textExtensions = new Map([
  ['csv', 'text/csv'],
  ['json', 'application/json'],
  ['md', 'text/markdown'],
  ['txt', 'text/plain'],
]);

function abortIfNeeded(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

function extension(name: string): string {
  return name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
}

function attachmentType(file: File): { kind: 'text' | 'image'; mediaType: string } | null {
  const fileExtension = extension(file.name);
  if (fileExtension === 'svgz') {
    return null;
  }
  if (imageTypes.has(file.type) || imageExtensions.has(fileExtension)) {
    return {
      kind: 'image',
      mediaType: imageTypes.has(file.type) ? file.type : imageExtensions.get(fileExtension)!,
    };
  }
  if (textTypes.has(file.type) || textExtensions.has(fileExtension)) {
    return {
      kind: 'text',
      mediaType: textTypes.has(file.type) ? file.type : textExtensions.get(fileExtension)!,
    };
  }
  return null;
}

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : fallback;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32_768)));
  }
  return btoa(chunks.join(''));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export class BuilderAttachments {
  private readonly uploadImage: BuilderAttachmentsOptions['uploadImage'];
  private readonly maxFileBytes: number;
  private readonly maxAttachments: number;
  private readonly maxRetainedBytes: number;
  private readonly attachments = new Map<string, StoredAttachment>();
  private readonly listeners = new Set<
    (attachments: readonly BuilderAttachmentSummary[]) => void
  >();
  private sequence = 0;
  private retainedBytes = 0;

  constructor({
    uploadImage,
    maxFileBytes = defaultMaxFileBytes,
    maxAttachments = defaultMaxAttachments,
    maxRetainedBytes,
  }: BuilderAttachmentsOptions) {
    this.uploadImage = uploadImage;
    this.maxFileBytes = Math.max(1, Math.floor(maxFileBytes));
    this.maxAttachments = Math.max(1, Math.floor(maxAttachments));
    this.maxRetainedBytes = Math.max(
      this.maxFileBytes,
      Math.floor(maxRetainedBytes ?? this.maxFileBytes * this.maxAttachments),
    );
  }

  list(): BuilderAttachmentSummary[] {
    return Array.from(this.attachments.values(), (attachment) => this.summary(attachment));
  }

  snapshot(): BuilderAttachmentSnapshot {
    return Object.freeze({
      version: 1,
      attachments: Object.freeze(Array.from(this.attachments.values())),
    });
  }

  restore(snapshot: BuilderAttachmentSnapshot): void {
    if (
      !isRecord(snapshot) ||
      snapshot.version !== 1 ||
      !Array.isArray(snapshot.attachments) ||
      snapshot.attachments.length > this.maxAttachments
    ) {
      throw new Error('The Builder attachment checkpoint is invalid.');
    }
    const restored = new Map<string, StoredAttachment>();
    let snapshotBytes = 0;
    for (const value of snapshot.attachments) {
      if (
        !isRecord(value) ||
        typeof value.id !== 'string' ||
        !value.id ||
        restored.has(value.id) ||
        typeof value.name !== 'string' ||
        typeof value.mediaType !== 'string' ||
        typeof value.size !== 'number' ||
        !Number.isSafeInteger(value.size) ||
        value.size < 0 ||
        value.size > this.maxFileBytes ||
        (value.kind !== 'text' && value.kind !== 'image')
      ) {
        throw new Error('The Builder attachment checkpoint is invalid.');
      }
      snapshotBytes += value.size;
      if (value.kind === 'text') {
        if (typeof value.content !== 'string' || value.content.length > this.maxFileBytes) {
          throw new Error('The Builder attachment checkpoint is invalid.');
        }
        restored.set(
          value.id,
          Object.freeze({
            id: value.id,
            name: value.name,
            kind: 'text',
            mediaType: value.mediaType,
            size: value.size,
            preview: value.content.slice(0, previewCharacters),
            content: value.content,
          }),
        );
      } else {
        if (
          typeof value.url !== 'string' ||
          !value.url ||
          typeof value.data !== 'string' ||
          value.data.length > Math.ceil((this.maxFileBytes * 4) / 3) + 4 ||
          (value.source !== undefined &&
            (value.mediaType !== 'image/svg+xml' ||
              typeof value.source !== 'string' ||
              value.source.length > this.maxFileBytes))
        ) {
          throw new Error('The Builder attachment checkpoint is invalid.');
        }
        restored.set(
          value.id,
          Object.freeze({
            id: value.id,
            name: value.name,
            kind: 'image',
            mediaType: value.mediaType,
            size: value.size,
            url: value.url,
            data: value.data,
            source: value.source,
          }),
        );
      }
    }
    if (snapshotBytes > this.maxRetainedBytes) {
      throw new Error('The Builder attachment checkpoint exceeds the session storage limit.');
    }
    this.attachments.clear();
    restored.forEach((attachment, id) => this.attachments.set(id, attachment));
    this.retainedBytes = Math.max(this.retainedBytes, snapshotBytes);
    this.emit();
  }

  subscribe(listener: (attachments: readonly BuilderAttachmentSummary[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.list());
    return () => this.listeners.delete(listener);
  }

  async add(
    files: readonly File[],
    signal = new AbortController().signal,
  ): Promise<{ added: BuilderAttachmentSummary[]; errors: BuilderAttachmentError[] }> {
    const added: BuilderAttachmentSummary[] = [];
    const errors: BuilderAttachmentError[] = [];

    for (const file of files) {
      abortIfNeeded(signal);
      if (this.attachments.size >= this.maxAttachments) {
        errors.push({
          name: file.name,
          code: 'attachment_limit_reached',
          message: `Builder supports up to ${this.maxAttachments} attachments in one session.`,
        });
        continue;
      }
      if (file.size > this.maxFileBytes) {
        errors.push({
          name: file.name,
          code: 'attachment_too_large',
          message: `${file.name} is larger than the ${Math.floor(this.maxFileBytes / (1024 * 1024)) || 1} MB attachment limit.`,
        });
        continue;
      }
      if (this.retainedBytes + file.size > this.maxRetainedBytes) {
        errors.push({
          name: file.name,
          code: 'attachment_session_limit_reached',
          message:
            'This Builder session has reached its attachment storage limit. Reopen Builder to start with a fresh attachment set.',
        });
        continue;
      }
      const type = attachmentType(file);
      if (!type) {
        errors.push({
          name: file.name,
          code: 'unsupported_attachment_type',
          message:
            'Builder supports CSV, JSON, text, Markdown, GIF, JPEG, PNG, SVG, and WebP files.',
        });
        continue;
      }

      this.sequence += 1;
      const id = `attachment-${Date.now()}-${this.sequence}`;
      try {
        let stored: StoredAttachment;
        if (type.kind === 'text') {
          const content = await file.text();
          abortIfNeeded(signal);
          stored = Object.freeze({
            id,
            name: file.name,
            kind: 'text',
            mediaType: type.mediaType,
            size: file.size,
            preview: content.slice(0, previewCharacters),
            content,
          });
        } else {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const source =
            type.mediaType === 'image/svg+xml' ? new TextDecoder().decode(bytes) : undefined;
          const data = source === undefined ? bytesToBase64(bytes) : '';
          abortIfNeeded(signal);
          const url = await this.uploadImage(file);
          abortIfNeeded(signal);
          if (!url) {
            throw new Error('The image upload did not return a URL.');
          }
          stored = Object.freeze({
            id,
            name: file.name,
            kind: 'image',
            mediaType: type.mediaType,
            size: file.size,
            url,
            data,
            source,
          });
        }
        this.attachments.set(id, stored);
        this.retainedBytes += file.size;
        added.push(this.summary(stored));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
        errors.push({
          name: file.name,
          code: 'attachment_upload_failed',
          message:
            error instanceof Error ? error.message : 'Builder could not add this attachment.',
        });
      }
    }

    if (added.length) {
      this.emit();
    }
    return { added, errors };
  }

  remove(id: string): boolean {
    const removed = this.attachments.delete(id);
    if (removed) {
      this.emit();
    }
    return removed;
  }

  getTools(getRevision: () => string): BuilderToolDefinition[] {
    return [
      {
        name: 'read_attachment',
        description:
          'Read bounded text lines from a user-provided attachment, or retrieve an uploaded image URL and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            startLine: { type: 'integer', minimum: 1 },
            startColumn: { type: 'integer', minimum: 1 },
            endLine: { type: 'integer', minimum: 1 },
          },
          required: ['id'],
          additionalProperties: false,
        },
        execute: (input, signal) => Promise.resolve(this.read(input, signal, getRevision())),
      },
      {
        name: 'search_attachment',
        description:
          'Search one text attachment for a bounded literal query and return matching line excerpts.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            query: { type: 'string', minLength: 1, maxLength: maxSearchQueryCharacters },
          },
          required: ['id', 'query'],
          additionalProperties: false,
        },
        execute: (input, signal) => Promise.resolve(this.search(input, signal, getRevision())),
      },
    ];
  }

  private read(
    input: Record<string, unknown>,
    signal: AbortSignal,
    revision: string,
  ): BuilderToolResult<unknown> {
    abortIfNeeded(signal);
    const attachment = typeof input.id === 'string' ? this.attachments.get(input.id) : undefined;
    if (!attachment) {
      return this.failure(
        revision,
        'attachment_not_found',
        'The requested attachment is no longer available.',
      );
    }
    if (attachment.kind === 'image') {
      if (attachment.mediaType === 'image/svg+xml') {
        const source = attachment.source ?? '';
        return {
          ok: true,
          revision,
          data: {
            ...this.summary(attachment),
            source: source.slice(0, maxReadCharacters),
            sourceTruncated: source.length > maxReadCharacters,
            modelPreview:
              'SVG source is provided as text because model vision accepts raster images only.',
          },
        };
      }
      return {
        ok: true,
        revision,
        data: this.summary(attachment),
        attachments: [{ type: 'image', mediaType: attachment.mediaType, data: attachment.data }],
      };
    }

    const lines = (attachment.content ?? '').split('\n');
    const startLine = boundedInteger(input.startLine, 1, 1, Math.max(1, lines.length));
    const startColumn = boundedInteger(
      input.startColumn,
      1,
      1,
      (lines[startLine - 1]?.length ?? 0) + 1,
    );
    const requestedEnd = boundedInteger(
      input.endLine,
      Math.min(lines.length, startLine + maxReadLines - 1),
      startLine,
      lines.length,
    );
    const lineLimit = Math.min(requestedEnd, startLine + maxReadLines - 1);
    const chunks: string[] = [];
    let remaining = maxReadCharacters;
    let endLine = startLine;
    let endColumn = startColumn - 1;
    let next: { startLine: number; startColumn: number } | null = null;

    for (let lineNumber = startLine; lineNumber <= lineLimit; lineNumber += 1) {
      const line = lines[lineNumber - 1] ?? '';
      const column = lineNumber === startLine ? startColumn : 1;
      if (lineNumber > startLine) {
        if (remaining === 0) {
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
      if (remaining === 0 && lineNumber < lines.length) {
        next = { startLine: lineNumber + 1, startColumn: 1 };
        break;
      }
    }

    if (!next && endLine < lines.length) {
      next = { startLine: endLine + 1, startColumn: 1 };
    }
    return {
      ok: true,
      revision,
      data: {
        id: attachment.id,
        name: attachment.name,
        mediaType: attachment.mediaType,
        size: attachment.size,
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

  private search(
    input: Record<string, unknown>,
    signal: AbortSignal,
    revision: string,
  ): BuilderToolResult<unknown> {
    abortIfNeeded(signal);
    const attachment = typeof input.id === 'string' ? this.attachments.get(input.id) : undefined;
    if (!attachment) {
      return this.failure(
        revision,
        'attachment_not_found',
        'The requested attachment is no longer available.',
      );
    }
    if (attachment.kind !== 'text') {
      return this.failure(
        revision,
        'attachment_not_text',
        `${attachment.name} is an image and cannot be searched as text.`,
      );
    }
    if (
      typeof input.query !== 'string' ||
      !input.query ||
      input.query.length > maxSearchQueryCharacters
    ) {
      return this.failure(
        revision,
        'invalid_attachment_query',
        `Use a non-empty search query no longer than ${maxSearchQueryCharacters} characters.`,
      );
    }

    const matches: Array<{ line: number; text: string }> = [];
    let totalMatches = 0;
    const query = input.query.toLocaleLowerCase();
    (attachment.content ?? '').split('\n').forEach((line, index) => {
      if (line.toLocaleLowerCase().includes(query)) {
        totalMatches += 1;
        if (matches.length < maxSearchResults) {
          matches.push({ line: index + 1, text: line.slice(0, maxSearchExcerptCharacters) });
        }
      }
    });
    return {
      ok: true,
      revision,
      data: {
        id: attachment.id,
        name: attachment.name,
        query: input.query,
        matches,
        totalMatches,
        truncated: totalMatches > matches.length,
      },
    };
  }

  private failure(revision: string, code: string, message: string): BuilderToolResult<never> {
    return { ok: false, revision, error: { code, message, retryable: false } };
  }

  private summary(attachment: StoredAttachment): BuilderAttachmentSummary {
    if (attachment.kind === 'text') {
      return {
        id: attachment.id,
        name: attachment.name,
        kind: attachment.kind,
        mediaType: attachment.mediaType,
        size: attachment.size,
        preview: attachment.preview,
      };
    }
    return {
      id: attachment.id,
      name: attachment.name,
      kind: attachment.kind,
      mediaType: attachment.mediaType,
      size: attachment.size,
      url: attachment.url,
    };
  }

  private emit(): void {
    const attachments = this.list();
    this.listeners.forEach((listener) => listener(attachments));
  }
}
