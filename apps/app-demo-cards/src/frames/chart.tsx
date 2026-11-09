// The chart card's live frame: the same chart, with tooltips and animation.
import { connectLiveFrame } from '@tryghost/app-sdk/live-frame';

import {
  chartDescription,
  isChartTable,
  readChartConfig,
  sampleChartTable,
} from '../chart/chart-data.ts';
import { renderInteractiveChart } from '../chart/chart-engine.ts';
import { CHART_CSS } from '../chart/render.tsx';

connectLiveFrame({
  start(context) {
    const style = document.createElement('style');
    style.textContent = `body{font-family:${context.theme.font_family || 'system-ui, sans-serif'}}${CHART_CSS}`;
    document.head.append(style);

    const table = isChartTable(context.properties.table)
      ? context.properties.table
      : sampleChartTable;
    const config = readChartConfig(context.properties, table);
    const root = document.getElementById('card')!;
    const figure = document.createElement('figure');
    figure.className = 'chart-card';
    const visual = document.createElement('div');
    visual.className = 'chart-card__visual';
    const caption = document.createElement('figcaption');
    caption.textContent = chartDescription(config);
    figure.append(visual, caption);
    root.replaceChildren(figure);

    let chart = renderInteractiveChart(visual, table, config);
    // Redraws at the new width, as the chart is drawn at a fixed size.
    let width = visual.clientWidth;
    new ResizeObserver(() => {
      if (visual.clientWidth !== width) {
        width = visual.clientWidth;
        chart.dispose();
        chart = renderInteractiveChart(visual, table, config);
      }
    }).observe(visual);
  },
});
