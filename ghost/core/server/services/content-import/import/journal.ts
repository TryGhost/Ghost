import { Readable } from 'node:stream';
import errors from '@tryghost/errors';
import type { ImportStorage } from '../../../adapters/storage/import-storage';
import { serialize } from '../csv';
import { parseCSVStream } from '../csv/parse-stream';
import { createErrorsFileFormatter } from './errors-file';
import type { RowOutcome } from './store';

const BATCH_ROWS = 25;
const BATCH_MS = 1000;
const BATCH_BYTES = 8 * 1024 * 1024;
const CHECKPOINT = 'checkpoint.txt';
export const ERROR_HEADER = 'errors-header.csv';

export interface JournalPosition {
  record: number;
  part: number;
}

export type JournalStorage = Pick<ImportStorage, 'readStream' | 'writeStream' | 'replaceMetadata'>;
type Part = { outcome: string; error?: string };

export async function readMetadata(
  storage: JournalStorage,
  key: string,
): Promise<string | undefined> {
  let stream: Readable;
  try {
    stream = await storage.readStream({ path: key });
  } catch (error) {
    if (error instanceof errors.NotFoundError) {
      return undefined;
    }
    throw error;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16 * 1024) {
      throw new errors.InternalServerError({ message: 'CSV import metadata exceeded its limit.' });
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function asPosition(value: string | undefined): number {
  if (value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) {
    return Number(value);
  }
  throw new errors.InternalServerError({ message: 'Invalid CSV import checkpoint.' });
}

export async function readJournalPosition(storage: JournalStorage): Promise<JournalPosition> {
  const record = asPosition((await readMetadata(storage, CHECKPOINT)) ?? '0');
  const part = record ? asPosition(await readMetadata(storage, `commits/${record}.txt`)) : 0;
  if (record && (part < 1 || part > record)) {
    throw new errors.InternalServerError({ message: 'Invalid CSV import journal part.' });
  }
  return { record, part };
}

function partKey(kind: 'outcomes' | 'errors', part: number): string {
  return `${kind}/${part}.csv`;
}

export async function* readJSONParts<T>(storage: JournalStorage, { part }: JournalPosition) {
  for (let index = 1; index <= part; index++) {
    const source = await storage.readStream({ path: partKey('outcomes', index) });
    for await (const cells of parseCSVStream(source, {
      delimiter: ',',
      newline: '\r\n',
      skipEmptyLines: true,
    })) {
      if (cells.length !== 1) {
        throw new errors.InternalServerError({ message: 'Invalid CSV import journal record.' });
      }
      yield JSON.parse(cells[0]) as T;
    }
  }
}

export function readOutcomeParts(storage: JournalStorage, position: JournalPosition) {
  return readJSONParts<RowOutcome>(storage, position);
}

export function scopeJournalStorage(storage: JournalStorage, prefix: string): JournalStorage {
  return {
    readStream: ({ path }) => storage.readStream({ path: `${prefix}/${path}` }),
    writeStream: (key, source) => storage.writeStream(`${prefix}/${key}`, source),
    replaceMetadata: (key, bytes) => storage.replaceMetadata(`${prefix}/${key}`, bytes),
  };
}

export async function* readErrorParts(storage: JournalStorage, { part }: JournalPosition) {
  for (let index = 1; index <= part; index++) {
    const source = await storage.readStream({ path: partKey('errors', index) });
    yield* source as AsyncIterable<Buffer>;
  }
}

export class JournalBatch {
  private storage: JournalStorage;
  private readonly includeErrorParts: boolean;
  private position: JournalPosition;
  private batch: Part[] = [];
  private bytes = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private flushing?: Promise<void>;

  constructor(storage: JournalStorage, position: JournalPosition, includeErrorParts: boolean) {
    this.storage = storage;
    this.position = position;
    this.includeErrorParts = includeErrorParts;
  }

  async append(entry: Part): Promise<void> {
    await this.flushing;
    const bytes = Buffer.byteLength(entry.outcome) + Buffer.byteLength(entry.error ?? '') + 4;
    if (this.batch.length && this.bytes + bytes > BATCH_BYTES) {
      await this.flush();
    }
    this.batch.push(entry);
    this.bytes += bytes;
    if (this.batch.length >= BATCH_ROWS || this.bytes >= BATCH_BYTES) {
      await this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => {
        // Retain any failure for the next append or terminal flush.
        void this.flush().catch(() => {});
      }, BATCH_MS);
      this.timer.unref();
    }
  }

  async flush(): Promise<JournalPosition> {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.flushing && this.batch.length) {
      this.flushing = this.commit().then(() => {
        this.flushing = undefined;
      });
    }
    await this.flushing;
    return this.position;
  }

  private async commit(): Promise<void> {
    const part = this.position.part + 1;
    const record = this.position.record + this.batch.length;
    const encoded = (kind: keyof Part) =>
      Readable.from(this.batch.flatMap((entry) => (entry[kind] ? [entry[kind], '\r\n'] : [])));
    await this.storage.writeStream(partKey('outcomes', part), encoded('outcome'));
    if (this.includeErrorParts) {
      await this.storage.writeStream(partKey('errors', part), encoded('error'));
    }
    await this.storage.replaceMetadata(`commits/${record}.txt`, Buffer.from(String(part)));
    await this.storage.replaceMetadata(CHECKPOINT, Buffer.from(String(record)));
    this.position = { record, part };
    this.batch = [];
    this.bytes = 0;
  }
}

export function journalRecord(value: unknown): string {
  return serialize([{ outcome: JSON.stringify(value) }], { header: false });
}

export class ImportJournal {
  private batch: JournalBatch;
  private formatError: ReturnType<typeof createErrorsFileFormatter>;
  private storage: JournalStorage;
  private errorHeader?: Promise<void>;

  constructor(storage: JournalStorage, columns: string[], position: JournalPosition) {
    this.storage = storage;
    this.batch = new JournalBatch(storage, position, true);
    this.formatError = createErrorsFileFormatter(columns);
  }

  async append(row: RowOutcome): Promise<void> {
    const error = this.formatError.row(row);
    if (error) {
      this.errorHeader ??= this.storage.writeStream(
        ERROR_HEADER,
        Readable.from([this.formatError.header]),
      );
      await this.errorHeader;
    }
    return this.batch.append({
      outcome: journalRecord({ ...row, source: undefined }),
      error,
    });
  }

  flush(): Promise<JournalPosition> {
    return this.batch.flush();
  }
}
