import {createChartPatchFromFile, createLabelColumnPatch} from '../src/editor-settings-model.ts';
import {describe, expect, it} from 'vitest';

describe('chart editor settings', () => {
    const file = (name: string, text: string) => ({
        name,
        type: 'text/csv',
        size: new TextEncoder().encode(text).byteLength,
        bytes: new TextEncoder().encode(text)
    });

    it('turns the chosen CSV into durable table properties and clears a stale fallback', () => {
        expect(createChartPatchFromFile(file('readers.csv', 'Quarter,Readers,Members\nQ1,1200,40\nQ2,1800,58'))).toEqual({
            table: {
                columns: ['Quarter', 'Readers', 'Members'],
                rows: [['Q1', 1200, 40], ['Q2', 1800, 58]]
            },
            labelColumn: 'Quarter',
            valueColumn: 'Readers',
            fallbackImageUrl: null
        });
    });

    it('selects the first numeric value series rather than an intervening text column', () => {
        expect(createChartPatchFromFile(file('readers.csv', 'Month,Region,Readers\nJan,EU,1200\nFeb,US,1800'))).toMatchObject({
            labelColumn: 'Month',
            valueColumn: 'Readers'
        });
    });

    it('uses a later label when the first column is the numeric value series', () => {
        expect(createChartPatchFromFile(file('counts.csv', 'Count,Category\n10,A\n20,B'))).toMatchObject({
            labelColumn: 'Category',
            valueColumn: 'Count'
        });
    });

    it('keeps the conventional first-column label when every column is numeric', () => {
        expect(createChartPatchFromFile(file('sales.csv', 'Year,Sales\n2025,100\n2026,120'))).toMatchObject({
            labelColumn: 'Year',
            valueColumn: 'Sales'
        });
    });

    it('rejects a table without a numeric value series', () => {
        expect(() => createChartPatchFromFile(file('labels.csv', 'Month,Region\nJan,EU\nFeb,US'))).toThrow('numeric value column');
    });

    it('changes a conflicting value series with the label column atomically', () => {
        const table = {
            columns: ['Quarter', 'Readers', 'Members'],
            rows: [['Q1', 1200, 40]]
        };

        expect(createLabelColumnPatch(table, 'Readers', 'Readers')).toEqual({
            labelColumn: 'Readers',
            valueColumn: 'Members',
            fallbackImageUrl: null
        });
    });
});
