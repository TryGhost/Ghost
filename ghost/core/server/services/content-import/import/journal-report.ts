import { Readable } from 'node:stream';
import {
  ERROR_HEADER,
  readErrorParts,
  readJournalPosition,
  readOutcomeParts,
  type JournalPosition,
  type JournalStorage,
} from './journal';
import { reportHeader, reportRow } from './report';
import { addOutcome, type ImportSummary } from './summary';

export type ImportReportName = 'report.csv' | 'errors.csv';

export interface ImportReportContents {
  report?: string;
  errorsFile?: string;
  downloads?: ImportReportName[];
}

export interface ImportReportFile {
  name: ImportReportName;
  bytes: number;
}

export async function deliverReports(
  storage: JournalStorage,
  files: ImportReportFile[],
  retain: (files: ImportReportFile[]) => Promise<void>,
): Promise<ImportReportContents> {
  const total = files.reduce((bytes, file) => bytes + file.bytes, 0);
  if (total <= 10 * 1024 * 1024) {
    return readReportContents(storage, files);
  }
  await retain(files);
  return { downloads: files.map(({ name }) => name) };
}

export const reportFileKey = (name: ImportReportName) => `final/${name}`;

async function* reportChunks(
  storage: JournalStorage,
  position: JournalPosition,
  summary: ImportSummary,
) {
  yield Buffer.from(reportHeader);
  for await (const row of readOutcomeParts(storage, position)) {
    addOutcome(summary, row);
    yield Buffer.from('\r\n' + reportRow(row));
  }
}

async function* errorChunks(storage: JournalStorage, position: JournalPosition) {
  let hasErrors = false;
  let tail = Buffer.alloc(0);
  for await (const chunk of readErrorParts(storage, position)) {
    if (chunk.length) {
      if (!hasErrors) {
        hasErrors = true;
        const header = await storage.readStream({ path: ERROR_HEADER });
        yield* header as AsyncIterable<Buffer>;
        yield Buffer.from('\r\n');
      }
      const bytes = Buffer.concat([tail, chunk]);
      // Every part ends in CRLF. Omit only the final separator.
      yield bytes.subarray(0, -2);
      tail = Buffer.from(bytes.subarray(-2));
    }
  }
}

async function writeFile(
  storage: JournalStorage,
  name: ImportReportName,
  chunks: AsyncGenerator<Buffer>,
) {
  const first = await chunks.next();
  if (first.done) {
    return undefined;
  }

  let bytes = first.value.length;
  const source = Readable.from(
    (async function* () {
      try {
        yield first.value;
        for await (const chunk of chunks) {
          bytes += chunk.length;
          yield chunk;
        }
      } finally {
        await chunks.return(undefined);
      }
    })(),
  );
  try {
    await storage.writeStream(reportFileKey(name), source);
  } finally {
    source.destroy();
    await chunks.return(undefined);
  }
  return { name, bytes };
}

export async function writeImportReports(
  storage: JournalStorage,
  summary: ImportSummary,
): Promise<ImportReportFile[]> {
  const position = await readJournalPosition(storage);
  if (!position.record) {
    return [];
  }

  const report = await writeFile(storage, 'report.csv', reportChunks(storage, position, summary));
  const errors = await writeFile(storage, 'errors.csv', errorChunks(storage, position));
  return [report, errors].filter((file) => file !== undefined);
}

export async function readReportContents(
  storage: JournalStorage,
  files: ImportReportFile[],
): Promise<ImportReportContents> {
  const result: ImportReportContents = {};
  for (const file of files) {
    const input = await storage.readStream({ path: reportFileKey(file.name) });
    const chunks: Buffer[] = [];
    for await (const chunk of input as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const contents = Buffer.concat(chunks).toString('utf8');
    if (file.name === 'report.csv') {
      result.report = contents;
    } else {
      result.errorsFile = contents;
    }
  }
  return result;
}
