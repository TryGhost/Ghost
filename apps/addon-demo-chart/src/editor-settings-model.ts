import {numericValueColumns, parseChartCsv, type ChartTable} from './chart-data.ts';
import type {GhEditorFile} from '@tryghost/addon-kit/editor-settings';

export function createChartPatchFromFile(file: GhEditorFile): Record<string, unknown> {
    let csv: string;
    try {
        csv = new TextDecoder('utf-8', {fatal: true}).decode(file.bytes);
    } catch {
        throw new Error('CSV files must use UTF-8 text encoding.');
    }
    const table = parseChartCsv(csv);
    const preferredLabelColumn = table.columns[0]!;
    const preferredValueColumn = numericValueColumns(table, preferredLabelColumn)[0];
    const valueColumn = preferredValueColumn ?? numericValueColumns(table)[0];
    if (!valueColumn) {
        throw new Error('CSV must contain at least one numeric value column.');
    }
    const labelColumn = preferredValueColumn
        ? preferredLabelColumn
        : table.columns.find(column => column !== valueColumn)!;
    return {
        table,
        labelColumn,
        valueColumn,
        fallbackImageUrl: null
    };
}

export function createChartConfigurationPatch(patch: Record<string, unknown>): Record<string, unknown> {
    return {...patch, fallbackImageUrl: null};
}

export function createLabelColumnPatch(table: ChartTable, labelColumn: string, valueColumn: string): Record<string, unknown> {
    const availableValueColumns = numericValueColumns(table, labelColumn);
    const nextValueColumn = availableValueColumns.includes(valueColumn) ? valueColumn : availableValueColumns[0];
    return createChartConfigurationPatch({labelColumn, valueColumn: nextValueColumn});
}
