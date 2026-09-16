import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  AriaComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
import { buildChartOption, type ChartConfig, type ChartTable } from './chart-data.ts';
import { init, use as registerEChartsModules, type ECharts } from 'echarts/core';

registerEChartsModules([
  AriaComponent,
  BarChart,
  CanvasRenderer,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  PieChart,
  SVGRenderer,
  TitleComponent,
  TooltipComponent,
]);

const CHART_WIDTH = 720;
const CHART_HEIGHT = 380;

export function renderStaticChart(table: ChartTable, config: ChartConfig): string {
  const chart = init(null, undefined, {
    renderer: 'svg',
    ssr: true,
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  });
  try {
    chart.setOption(buildChartOption(table, config));
    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
}

export function renderInteractiveChart(
  root: HTMLElement,
  table: ChartTable,
  config: ChartConfig,
): ECharts {
  root.replaceChildren();
  const chart = init(root, undefined, {
    renderer: 'svg',
    width: root.clientWidth || CHART_WIDTH,
    height: CHART_HEIGHT,
  });
  chart.setOption(buildChartOption(table, config, { animation: true }));
  return chart;
}

export async function renderChartPng(table: ChartTable, config: ChartConfig): Promise<Uint8Array> {
  const root = document.createElement('div');
  const chart = init(root, undefined, {
    renderer: 'canvas',
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  });
  try {
    chart.setOption(buildChartOption(table, config));
    const dataUrl = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
    const encoded = dataUrl.split(',', 2)[1];
    if (!dataUrl.startsWith('data:image/png;base64,') || !encoded) {
      throw new Error('Chart renderer did not produce a PNG image');
    }
    const binary = atob(encoded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } finally {
    chart.dispose();
  }
}
