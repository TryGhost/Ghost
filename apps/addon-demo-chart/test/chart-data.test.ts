import {buildChartOption, parseChartCsv, sampleChartTable} from '../src/chart-data.ts';
import {describe, expect, it} from 'vitest';

describe('chart data', () => {
    it('normalizes a quoted CSV into a bounded public table', () => {
        expect(parseChartCsv('\ufeffMonth,Revenue,Subscribers\r\n"Jan, 2026",1200,42\r\nFeb,1350,51')).toEqual({
            columns: ['Month', 'Revenue', 'Subscribers'],
            rows: [
                ['Jan, 2026', 1200, 42],
                ['Feb', 1350, 51]
            ]
        });
    });

    it('rejects data beyond the durable table bounds', () => {
        const rows = Array.from({length: 101}, (_, index) => `Row ${index},${index}`).join('\n');

        expect(() => parseChartCsv(`Label,Value\n${rows}`)).toThrow('100 data rows');
    });

    it('rejects headers that exceed the durable cell bound', () => {
        expect(() => parseChartCsv(`${'x'.repeat(513)},Value\nLabel,10`)).toThrow('512 characters');
    });

    it('rejects numeric values that cannot be stored without integer rounding', () => {
        expect(() => parseChartCsv('Label,Value\nUnsafe,9007199254740993')).toThrow('safe numeric range');
    });

    it('builds bar and line options from the same normalized source', () => {
        const bar = buildChartOption(sampleChartTable, {type: 'bar', labelColumn: 'Month', valueColumn: 'Readers', smooth: false});
        const line = buildChartOption(sampleChartTable, {type: 'line', labelColumn: 'Month', valueColumn: 'Readers', smooth: true});

        expect(bar).toMatchObject({
            dataset: {source: [sampleChartTable.columns, ...sampleChartTable.rows]},
            series: [{type: 'bar', encode: {x: 'Month', y: 'Readers'}}]
        });
        expect(line).toMatchObject({
            series: [{type: 'line', smooth: true, encode: {x: 'Month', y: 'Readers'}}]
        });
        expect(bar).toMatchObject({title: {text: 'Readers by Month'}});
    });
});
