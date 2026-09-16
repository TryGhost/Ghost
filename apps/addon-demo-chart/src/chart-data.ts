import Papa from 'papaparse';
import type { EChartsCoreOption } from 'echarts/core';

export type ChartCell = string | number;

export interface ChartTable {
  columns: string[];
  rows: ChartCell[][];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie';
  labelColumn: string;
  valueColumn: string;
  smooth: boolean;
  horizontal: boolean;
  donut: boolean;
  showLegend: boolean;
  showValues: boolean;
  title: string;
  description: string;
}

const MAX_COLUMNS = 8;
const MAX_ROWS = 100;
const MAX_CELL_CHARACTERS = 512;

export const sampleChartTable: ChartTable = {
  columns: ['Month', 'Readers'],
  rows: [
    ['January', 2800],
    ['February', 3400],
    ['March', 3900],
    ['April', 4700],
    ['May', 5400],
  ],
};

function normalizeCell(value: unknown): ChartCell {
  const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  if (text.length > MAX_CELL_CHARACTERS) {
    throw new Error(`CSV cells may contain at most ${MAX_CELL_CHARACTERS} characters.`);
  }
  if (text !== '' && /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(text)) {
    const number = Number(text);
    const isIntegerSyntax = /^[-+]?\d+$/.test(text);
    if (
      Number.isFinite(number) &&
      Math.abs(number) <= Number.MAX_SAFE_INTEGER &&
      (!isIntegerSyntax || Number.isSafeInteger(number))
    ) {
      return number;
    }
    throw new Error('CSV numbers must be finite and within the safe numeric range.');
  }
  return text;
}

export function parseChartCsv(csv: string): ChartTable {
  const parsed = Papa.parse<string[]>(csv.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' });
  if (parsed.errors.length > 0) {
    throw new Error(`Could not parse CSV: ${parsed.errors[0]?.message ?? 'invalid data'}`);
  }
  if (parsed.data.length < 2) {
    throw new Error('CSV must contain a header and at least one data row.');
  }

  const [header, ...dataRows] = parsed.data;
  if (header.length < 2) {
    throw new Error('CSV must contain at least two columns.');
  }
  if (header.length > MAX_COLUMNS) {
    throw new Error(`CSV may contain at most ${MAX_COLUMNS} columns.`);
  }
  if (dataRows.length > MAX_ROWS) {
    throw new Error(`CSV may contain at most ${MAX_ROWS} data rows.`);
  }

  const columns = header.map((value) => {
    const column = String(value).trim();
    if (column.length > MAX_CELL_CHARACTERS) {
      throw new Error(`CSV cells may contain at most ${MAX_CELL_CHARACTERS} characters.`);
    }
    return column;
  });
  if (columns.some((column) => column.length === 0)) {
    throw new Error('Every CSV column needs a name.');
  }
  if (new Set(columns).size !== columns.length) {
    throw new Error('CSV column names must be unique.');
  }

  const rows = dataRows.map((row, index) => {
    if (row.length !== columns.length) {
      throw new Error(`CSV row ${index + 2} does not match the header.`);
    }
    return row.map(normalizeCell);
  });

  return { columns, rows };
}

export function isChartTable(value: unknown): value is ChartTable {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const table = value as Partial<ChartTable>;
  return (
    Array.isArray(table.columns) &&
    table.columns.length >= 2 &&
    table.columns.length <= MAX_COLUMNS &&
    table.columns.every(
      (column) =>
        typeof column === 'string' && column.length > 0 && column.length <= MAX_CELL_CHARACTERS,
    ) &&
    new Set(table.columns).size === table.columns.length &&
    Array.isArray(table.rows) &&
    table.rows.length > 0 &&
    table.rows.length <= MAX_ROWS &&
    table.rows.every(
      (row) =>
        Array.isArray(row) &&
        row.length === table.columns!.length &&
        row.every(
          (cell) =>
            (typeof cell === 'number' && Number.isFinite(cell)) ||
            (typeof cell === 'string' && cell.length <= MAX_CELL_CHARACTERS),
        ),
    )
  );
}

export function readChartConfig(props: Record<string, unknown>, table: ChartTable): ChartConfig {
  const type = props.type === 'line' || props.type === 'pie' ? props.type : 'bar';
  const labelColumn =
    typeof props.labelColumn === 'string' && table.columns.includes(props.labelColumn)
      ? props.labelColumn
      : table.columns[0]!;
  const valueColumns = numericValueColumns(table, labelColumn);
  const defaultValueColumn =
    valueColumns[0] ?? table.columns.find((column) => column !== labelColumn) ?? table.columns[1]!;
  const valueColumn =
    typeof props.valueColumn === 'string' && valueColumns.includes(props.valueColumn)
      ? props.valueColumn
      : defaultValueColumn;
  const title =
    typeof props.title === 'string' && props.title.trim()
      ? props.title.trim()
      : `${valueColumn} by ${labelColumn}`;
  const defaultDescription = `A ${type} chart showing ${valueColumn} by ${labelColumn}.`;
  const description =
    typeof props.description === 'string' && props.description.trim()
      ? props.description.trim()
      : defaultDescription;
  return {
    type,
    labelColumn,
    valueColumn,
    smooth: type === 'line' && props.smooth === true,
    horizontal: type === 'bar' && props.horizontal === true,
    donut: type === 'pie' && props.donut === true,
    showLegend: props.showLegend !== false,
    showValues: props.showValues === true,
    title,
    description,
  };
}

export function numericValueColumns(table: ChartTable, labelColumn?: string): string[] {
  return table.columns.filter((column, columnIndex) => {
    if (column === labelColumn) {
      return false;
    }
    const values = table.rows.map((row) => row[columnIndex]);
    return (
      values.some((value) => typeof value === 'number') &&
      values.every((value) => typeof value === 'number' || value === '')
    );
  });
}

export function buildChartOption(
  table: ChartTable,
  config: ChartConfig,
  { animation = false }: { animation?: boolean } = {},
): EChartsCoreOption {
  const title = chartTitle(config);
  const contentTop = config.showLegend ? 112 : 76;
  const common = {
    animation,
    aria: { enabled: true, description: chartDescription(config) },
    color: ['#6558d3', '#2f80ed', '#1f9d78', '#e09f3e', '#d95d75', '#7a6ff0', '#5b8c5a', '#c56b32'],
    textStyle: { fontFamily: 'inherit' },
    title: {
      text: title,
      left: 24,
      right: 24,
      top: 16,
      textStyle: { overflow: 'truncate', width: 640 },
    },
    legend: {
      show: config.showLegend,
      type: 'scroll',
      top: 56,
      left: 24,
      right: 24,
    },
    dataset: { source: [table.columns, ...table.rows] },
  };

  if (config.type === 'pie') {
    return {
      ...common,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          name: config.valueColumn,
          center: ['50%', config.showLegend ? '62%' : '56%'],
          radius: config.donut ? ['44%', '70%'] : '70%',
          encode: { itemName: config.labelColumn, value: config.valueColumn },
          label: { show: config.showValues },
        },
      ],
    };
  }

  const horizontal = config.type === 'bar' && config.horizontal;
  return {
    ...common,
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 32, top: contentTop, bottom: 52 },
    xAxis: horizontal
      ? { type: 'value', name: config.valueColumn }
      : { type: 'category', name: config.labelColumn, nameLocation: 'middle', nameGap: 34 },
    yAxis: horizontal
      ? { type: 'category', name: config.labelColumn }
      : { type: 'value', name: config.valueColumn },
    series: [
      {
        type: config.type,
        name: config.valueColumn,
        encode: horizontal
          ? { x: config.valueColumn, y: config.labelColumn }
          : { x: config.labelColumn, y: config.valueColumn },
        smooth: config.type === 'line' ? config.smooth : undefined,
        label: {
          show: config.showValues,
          position: horizontal ? 'right' : 'top',
        },
      },
    ],
  };
}

export function chartTitle(config: ChartConfig): string {
  return config.title;
}

export function chartDescription(config: ChartConfig): string {
  return config.description;
}
