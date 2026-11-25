import { StringDecoder } from 'node:string_decoder';
import { createErrorsFileFormatter } from './errors-file';
import {
  readErrorParts,
  readJournalPosition,
  readOutcomeParts,
  type JournalStorage,
} from './journal';
import { reportHeader, reportRow } from './report';
import { addOutcome, type ImportSummary } from './summary';

export interface ImportReportContents {
  report?: string;
  errorsFile?: string;
}

export async function readImportReports(
  storage: JournalStorage,
  columns: string[],
  summary: ImportSummary,
): Promise<ImportReportContents> {
  const position = await readJournalPosition(storage);
  let report: string | undefined;
  for await (const row of readOutcomeParts(storage, position)) {
    addOutcome(summary, row);
    report = (report ?? reportHeader) + '\r\n' + reportRow(row);
  }
  let errorsFile: string | undefined;
  const decoder = new StringDecoder('utf8');
  for await (const chunk of readErrorParts(storage, position)) {
    if (chunk.length) {
      errorsFile =
        (errorsFile ?? createErrorsFileFormatter(columns).header + '\r\n') + decoder.write(chunk);
    }
  }
  return { report, errorsFile: errorsFile && (errorsFile + decoder.end()).slice(0, -2) };
}
