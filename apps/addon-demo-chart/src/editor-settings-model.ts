import {isChartTable, numericValueColumns, parseChartCsv, readChartConfig, sampleChartTable, type ChartConfig, type ChartTable} from './chart-data.ts';
import type {AddonAssetReference, AddonGeneratedImage, GhEditorFile} from '@tryghost/addon-kit/editor-settings';

interface ChartFallbackWorkflowDependencies {
    renderImage(table: ChartTable, config: ChartConfig): Promise<Uint8Array>;
    uploadImage(image: AddonGeneratedImage): Promise<AddonAssetReference>;
    proposePatch(patch: Record<string, unknown>): Promise<void>;
    onError?(error: Error): void;
}

export function createChartFallbackWorkflow({renderImage, uploadImage, proposePatch, onError}: ChartFallbackWorkflowDependencies) {
    let activeRevision = 0;

    const generate = async (props: Record<string, unknown>, revision: number) => {
        try {
            const table = isChartTable(props.table) ? props.table : sampleChartTable;
            const config = readChartConfig(props, table);
            const bytes = await renderImage(table, config);
            if (revision !== activeRevision) {
                return;
            }
            const asset = await uploadImage({name: 'chart.png', type: 'image/png', bytes});
            if (revision !== activeRevision) {
                return;
            }
            await proposePatch({fallbackImageUrl: asset.url});
        } catch (error) {
            if (revision === activeRevision) {
                onError?.(error instanceof Error ? error : new Error(String(error)));
            }
        }
    };

    return {
        async commit(currentProps: Record<string, unknown>, patch: Record<string, unknown>) {
            activeRevision += 1;
            const canonicalPatch = {...patch, fallbackImageUrl: null};
            const nextProps = {...currentProps, ...canonicalPatch};
            await proposePatch(canonicalPatch);
            return nextProps;
        },
        sync(props: Record<string, unknown>) {
            activeRevision += 1;
            const revision = activeRevision;
            if (!props.fallbackImageUrl) {
                void generate(props, revision);
            }
        },
        cancel() {
            activeRevision += 1;
        }
    };
}

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
