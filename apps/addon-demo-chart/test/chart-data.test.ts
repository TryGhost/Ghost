import {
  buildChartOption,
  parseChartCsv,
  readChartConfig,
  sampleChartTable,
} from '../src/chart-data.ts';
import { describe, expect, it } from 'vitest';

describe('chart data', () => {
  it('normalizes a quoted CSV into a bounded public table', () => {
    expect(
      parseChartCsv('\ufeffMonth,Revenue,Subscribers\r\n"Jan, 2026",1200,42\r\nFeb,1350,51'),
    ).toEqual({
      columns: ['Month', 'Revenue', 'Subscribers'],
      rows: [
        ['Jan, 2026', 1200, 42],
        ['Feb', 1350, 51],
      ],
    });
  });

  it('rejects data beyond the durable table bounds', () => {
    const rows = Array.from({ length: 101 }, (_, index) => `Row ${index},${index}`).join('\n');

    expect(() => parseChartCsv(`Label,Value\n${rows}`)).toThrow('100 data rows');
  });

  it('rejects headers that exceed the durable cell bound', () => {
    expect(() => parseChartCsv(`${'x'.repeat(513)},Value\nLabel,10`)).toThrow('512 characters');
  });

  it('rejects numeric values that cannot be stored without integer rounding', () => {
    expect(() => parseChartCsv('Label,Value\nUnsafe,9007199254740993')).toThrow(
      'safe numeric range',
    );
  });

  it('builds static bar and line options from the same normalized source', () => {
    const bar = buildChartOption(sampleChartTable, {
      type: 'bar',
      labelColumn: 'Month',
      valueColumn: 'Readers',
      smooth: false,
      horizontal: false,
      donut: false,
      showLegend: true,
      showValues: false,
      title: 'Readers by Month',
      description: 'Audience by month.',
    });
    const line = buildChartOption(sampleChartTable, {
      type: 'line',
      labelColumn: 'Month',
      valueColumn: 'Readers',
      smooth: true,
      horizontal: false,
      donut: false,
      showLegend: false,
      showValues: true,
      title: 'Readers by Month',
      description: 'Audience by month.',
    });

    expect(bar).toMatchObject({
      animation: false,
      dataset: { source: [sampleChartTable.columns, ...sampleChartTable.rows] },
      grid: { top: 112 },
      legend: { show: true, type: 'scroll', top: 56, left: 24, right: 24 },
      series: [{ type: 'bar', encode: { x: 'Month', y: 'Readers' }, label: { show: false } }],
    });
    expect(line).toMatchObject({
      legend: { show: false },
      series: [
        { type: 'line', smooth: true, encode: { x: 'Month', y: 'Readers' }, label: { show: true } },
      ],
    });
    expect(bar).toMatchObject({ title: { text: 'Readers by Month' } });
    expect(bar).toMatchObject({ textStyle: { fontFamily: 'inherit' } });
  });

  it('builds horizontal bars and pie variants from the same table', () => {
    const horizontalBar = buildChartOption(sampleChartTable, {
      type: 'bar',
      labelColumn: 'Month',
      valueColumn: 'Readers',
      smooth: false,
      horizontal: true,
      donut: false,
      showLegend: true,
      showValues: true,
      title: 'Readers by Month',
      description: 'Audience by month.',
    });
    const pie = buildChartOption(sampleChartTable, {
      type: 'pie',
      labelColumn: 'Month',
      valueColumn: 'Readers',
      smooth: false,
      horizontal: false,
      donut: true,
      showLegend: true,
      showValues: true,
      title: 'Readers by Month',
      description: 'Audience by month.',
    });

    expect(horizontalBar).toMatchObject({
      xAxis: { type: 'value' },
      yAxis: { type: 'category' },
      series: [{ type: 'bar', encode: { x: 'Readers', y: 'Month' } }],
    });
    expect(pie).toMatchObject({
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['44%', '70%'],
          encode: { itemName: 'Month', value: 'Readers' },
          label: { show: true },
        },
      ],
    });
    expect(pie).not.toHaveProperty('xAxis');
    expect(pie).not.toHaveProperty('yAxis');
  });

  it('keeps title and description independent while preserving derived defaults', () => {
    const defaults = readChartConfig(
      { labelColumn: 'Month', valueColumn: 'Readers' },
      sampleChartTable,
    );
    const custom = readChartConfig(
      {
        labelColumn: 'Month',
        valueColumn: 'Readers',
        title: 'Audience growth',
        description: 'Monthly readers gained during the launch.',
      },
      sampleChartTable,
    );

    expect(defaults).toMatchObject({
      title: 'Readers by Month',
      description: 'A bar chart showing Readers by Month.',
    });
    expect(custom).toMatchObject({
      title: 'Audience growth',
      description: 'Monthly readers gained during the launch.',
    });
    expect(buildChartOption(sampleChartTable, custom)).toMatchObject({
      aria: { description: 'Monthly readers gained during the launch.' },
      title: { text: 'Audience growth' },
    });
  });
});
