import {BarChart, LineChart} from 'echarts/charts';
import {AriaComponent, DatasetComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent} from 'echarts/components';
import {SVGRenderer} from 'echarts/renderers';
import {buildChartOption, type ChartConfig, type ChartTable} from './chart-data.ts';
import {init, use as registerEChartsModules, type ECharts} from 'echarts/core';

registerEChartsModules([
    AriaComponent,
    BarChart,
    DatasetComponent,
    GridComponent,
    LegendComponent,
    LineChart,
    SVGRenderer,
    TitleComponent,
    TooltipComponent
]);

const CHART_WIDTH = 720;
const CHART_HEIGHT = 380;

export function renderStaticChart(table: ChartTable, config: ChartConfig): string {
    const chart = init(null, undefined, {
        renderer: 'svg',
        ssr: true,
        width: CHART_WIDTH,
        height: CHART_HEIGHT
    });
    try {
        chart.setOption(buildChartOption(table, config));
        return chart.renderToSVGString();
    } finally {
        chart.dispose();
    }
}

export function renderInteractiveChart(root: HTMLElement, table: ChartTable, config: ChartConfig): ECharts {
    root.replaceChildren();
    const chart = init(root, undefined, {renderer: 'svg', width: root.clientWidth || CHART_WIDTH, height: CHART_HEIGHT});
    chart.setOption(buildChartOption(table, config));
    return chart;
}
