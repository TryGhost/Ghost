// The chart's static picture, rendered as SVG with no DOM, so it runs in Ghost's render Worker.
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  AriaComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components';
import { init, use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

import { buildChartOption, type ChartConfig, type ChartTable } from './chart-data.ts';

use([
  AriaComponent,
  BarChart,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  PieChart,
  SVGRenderer,
  TitleComponent,
]);

export const CHART_WIDTH = 720;
export const CHART_HEIGHT = 380;

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
