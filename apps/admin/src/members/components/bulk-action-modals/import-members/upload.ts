import moment from 'moment-timezone';
import {type ImportMembersCompleteResponseType} from '@tryghost/admin-x-framework/api/members';
import {type ImportResponse} from './state';
import {formatImportError} from './mapping';
import {unparseErrorCSV} from './csv';

export function buildImportResponse(importData: ImportMembersCompleteResponseType): ImportResponse {
    const importedCount = importData.meta.stats.imported;
    const erroredMembers = importData.meta.stats.invalid || [];
    const errorCount = erroredMembers.length;
    const errorListMap: Record<string, {message: string; count: number}> = {};

    const errorsWithFormattedMessages = erroredMembers.map((row) => {
        const {errors, ...columns} = row;
        const formatted = errors
            .map(reason => formatImportError(reason).trim())
            .filter(Boolean);
        for (const reason of formatted) {
            if (errorListMap[reason]) {
                errorListMap[reason].count += 1;
            } else {
                errorListMap[reason] = {message: reason, count: 1};
            }
        }
        // `errors` is dropped rather than spread: the error CSV echoes the submitted row
        // back, so every key here becomes a column of the downloaded file.
        return {...columns, error: formatted.join('\n')};
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
        importLabel: importData.meta.import_label || undefined
    };
}
