import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { renderInApp } from '@test-utils/acceptance';
import { GhAreaChart } from '@tryghost/shade/patterns';
import { formatNumber } from '@tryghost/shade/utils';
import { Box } from '@tryghost/shade/primitives';

// Exercise the shared chart in Admin's browser harness, where real SVG layout and hover work.
const renderChart = (dates: string[], value: number) =>
  renderInApp(
    <Box aria-label="Entries chart" className="w-[400px]" role="figure">
      <GhAreaChart
        className="h-[180px]"
        data={dates.map((date) => ({
          date,
          value,
          formattedValue: formatNumber(value),
          label: 'Entries',
        }))}
        id="entries"
        range={30}
        showYAxisValues={false}
        yAxisRange={[0, Math.max(1, value)]}
      />
    </Box>,
  );
const chart = () => page.getByRole('figure', { name: 'Entries chart' });
const ticks = () =>
  chart().element().querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick text');

describe('GhAreaChart dates and tooltip', () => {
  it.each([0, 7])('shows one centered date for a single day with %i entries', async (count) => {
    await renderChart(['2026-06-22'], count);
    await expect.poll(() => ticks().length).toBe(1);
    expect(ticks()[0].textContent).toBe('22 Jun');
    expect(ticks()[0].getAttribute('text-anchor')).toBe('middle');
  });

  it('aligns distinct endpoints and shows the hovered value', async () => {
    await renderChart(['2026-06-22', '2026-06-23'], 7);
    await expect.poll(() => ticks().length).toBe(2);
    expect(
      [...ticks()].map((tick) => [tick.textContent, tick.getAttribute('text-anchor')]),
    ).toEqual([
      ['22 Jun', 'start'],
      ['23 Jun', 'end'],
    ]);
    await chart().hover();
    await expect.element(chart().getByText('Entries', { exact: true })).toBeVisible();
    await expect.element(chart().getByText('7', { exact: true })).toBeVisible();
  });
});
