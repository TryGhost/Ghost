import renderToString from 'preact-render-to-string';
import type { CardRenderer } from '@tryghost/app-sdk/cards';

import {
  chartDescription,
  chartTitle,
  isChartTable,
  readChartConfig,
  sampleChartTable,
} from './chart-data.ts';
import { renderStaticChart } from './chart-static.ts';

/** What the live frame needs to draw the interactive chart. */
export const CHART_PUBLIC_PROPERTIES = [
  'table',
  'type',
  'labelColumn',
  'valueColumn',
  'smooth',
  'horizontal',
  'donut',
  'showLegend',
  'showValues',
  'title',
  'description',
];

export const CHART_CSS = `
.chart-card { box-sizing: border-box; margin: 0; padding: 18px 0 16px; border-top: 2px solid #1d1d1b; border-bottom: 1px solid #c9c9c5; color: #1d1d1b; }
.chart-card__visual { width: 100%; }
.chart-card__visual > svg { display: block; width: 100%; height: auto; }
.chart-card figcaption { margin-top: 8px; color: #5b5b56; font-size: 13px; line-height: 1.45; }
`;

export const renderChart: CardRenderer = ({ properties }) => {
  const table = isChartTable(properties.table) ? properties.table : sampleChartTable;
  const config = readChartConfig(properties, table);
  const description = chartDescription(config);
  const fallbackImageUrl =
    typeof properties.fallbackImageUrl === 'string' ? properties.fallbackImageUrl : '';
  const svg = renderStaticChart(table, config);

  return {
    html: renderToString(
      <figure className="chart-card">
        <div
          className="chart-card__visual"
          role="img"
          aria-label={description}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <figcaption>{description}</figcaption>
      </figure>,
    ),
    css: CHART_CSS,
    height: 470,
    // The picture the settings panel uploaded, as email can't run the chart.
    email_html: fallbackImageUrl
      ? renderToString(
          <table
            role="presentation"
            width="100%"
            style={{ borderCollapse: 'collapse', borderTop: '2px solid #1d1d1b' }}
          >
            <tbody>
              <tr>
                <td style={{ padding: '14px 0 0' }}>
                  <img
                    alt={chartTitle(config)}
                    src={fallbackImageUrl}
                    width="600"
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  />
                  <p
                    style={{
                      margin: '8px 0 0',
                      color: '#5b5b56',
                      fontSize: '13px',
                      lineHeight: '1.45',
                    }}
                  >
                    {description}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>,
        )
      : '',
    public_properties: CHART_PUBLIC_PROPERTIES,
  };
};
