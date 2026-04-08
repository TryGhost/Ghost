import moment from 'moment-timezone';
import {ImportResponse} from './state';
import {formatImportError} from './mapping';
import {unparseErrorCSV} from './csv';

type InvalidMemberRow = Record<string, string> & {error: string};

type UploadApiResponse = {
    meta: {
        stats: {
            imported: number;
            invalid: InvalidMemberRow[];
        };
        import_label?: {
            name: string;
            slug: string;
        };
    };
};

export function buildImportResponse(importData: UploadApiResponse): ImportResponse {
    const importedCount = importData.meta.stats.imported;
    const erroredMembers = importData.meta.stats.invalid || [];
    const errorCount = erroredMembers.length;
    const errorListMap: Record<string, {message: string; count: number}> = {};

    const errorsWithFormattedMessages = erroredMembers.map((row) => {
        const formattedError = formatImportError(row.error);
        formattedError.split(',').forEach((errorMsg: string) => {
            const trimmed = errorMsg.trim();
            if (errorListMap[trimmed]) {
                errorListMap[trimmed].count += 1;
            } else {
                errorListMap[trimmed] = {message: trimmed, count: 1};
            }
        });
        return {...row, error: formattedError};
    });

    const errorCsv = unparseErrorCSV(errorsWithFormattedMessages);
    const errorCsvBlob = new Blob([errorCsv], {type: 'text/csv'});
    const errorCsvUrl = URL.createObjectURL(errorCsvBlob);
    const importLabel = importData.meta.import_label;
    const errorCsvName = importLabel
        ? `${importLabel.name} - Errors.csv`
        : `Import ${moment().format('YYYY-MM-DD HH:mm')} - Errors.csv`;

    return {
        importedCount,
        errorCount,
        errorCsvUrl,
        errorCsvName,
        errorList: Object.values(errorListMap),
        importLabel: importData.meta.import_label
    };
}
