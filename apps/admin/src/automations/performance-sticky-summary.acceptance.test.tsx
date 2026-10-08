import { act } from 'react';
import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp, settleTransitions } from '@test-utils/acceptance';
import {
  flags,
  openAutomationSidebar,
  prepareStatuses,
  run,
  runsScroller,
} from './run-list.test-utils';

it('reveals sticky status chips after the cards scroll away and restores the summary without scroll jumps', async () => {
  prepareStatuses();
  fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?/, {
    automation_runs: Array.from({ length: 30 }, (_, index) => run({ id: `run-${index}` })),
    meta: { pagination: { limit: 50, next_cursor: null } },
  });
  await renderAdminApp('/automations/first', flags);
  await openAutomationSidebar();
  const statuses = () => page.getByRole('region', { name: 'Automation status counts' });
  const chart = () => page.getByRole('region', { name: 'Total runs' });
  await expect
    .element(statuses().getByRole('button', { name: 'Completed', exact: true }))
    .toHaveAccessibleDescription('1,260');

  const scroller = runsScroller();
  const expandedCards = statuses().element();
  const viewportHeight = scroller.clientHeight;
  const cardsBottom =
    expandedCards.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top;
  const scrollTo = async (top: number) => {
    await act(async () => {
      scroller.scrollTop = top;
      scroller.dispatchEvent(new Event('scroll'));
      await new Promise(requestAnimationFrame);
    });
    await settleTransitions();
    expect(scroller.scrollTop).toBeCloseTo(top, 0);
    expect(scroller.clientHeight).toBe(viewportHeight);
  };

  // Ordinary scrolling must move the cards, not immediately replace them.
  await scrollTo(40);
  expect(statuses().element()).toBe(expandedCards);
  expect(
    expandedCards.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top,
  ).toBeCloseTo(cardsBottom - 40, 0);

  await scrollTo(cardsBottom + 24);
  const chips = statuses().element();
  expect(chips).not.toBe(expandedCards);
  expect(expandedCards.closest('[inert]')).not.toBeNull();
  await expect
    .element(statuses().getByRole('button', { name: 'Completed', exact: true }))
    .toHaveAccessibleDescription('1,260');
  const chipsTop = chips.getBoundingClientRect().top;
  expect(chipsTop).toBeCloseTo(scroller.getBoundingClientRect().top, 0);

  await scrollTo(cardsBottom + 80);
  expect(statuses().element()).toBe(chips);
  expect(chips.getBoundingClientRect().top).toBeCloseTo(chipsTop, 0);

  // Cross back before reaching the top, then restore the original browsing position.
  await scrollTo(cardsBottom - 8);
  expect(statuses().element()).toBe(expandedCards);
  expect(expandedCards.closest('[inert]')).toBeNull();
  expect(chips.closest('[inert]')).not.toBeNull();
  await scrollTo(0);
  await expect.element(chart()).toBeVisible();
  expect(
    expandedCards.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top,
  ).toBeCloseTo(cardsBottom, 0);
});
