import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarTooltipContent } from './newsletters-kpis';

it('hides clicks in the chart tooltip when tracking is disabled', () => {
  const payload = [
    {
      value: 0.5,
      payload: {
        post_id: 'post-1',
        post_title: 'Post',
        send_date: '2026-01-10',
        sent_to: 100,
        total_opens: 50,
        open_rate: 0.5,
      },
    },
  ];
  const { rerender } = render(<BarTooltipContent active payload={payload} showClicks={false} />);
  expect(screen.getByText('Opens')).toBeTruthy();
  expect(screen.queryByText('Clicks')).toBeNull();
  rerender(<BarTooltipContent active payload={payload} showClicks />);
  expect(screen.getByText('Clicks').parentElement?.textContent).toContain('—');
});
