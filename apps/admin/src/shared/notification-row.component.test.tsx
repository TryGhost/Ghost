import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { renderInApp } from '@test-utils/acceptance';
import { Button } from '@tryghost/shade/components';
import { Box } from '@tryghost/shade/primitives';
import NotificationItem from '../../../activitypub/src/views/notifications/components/notification-item';

describe('notification row primary and secondary actions', () => {
  it('uses native Enter and Space activation with a full-row focus target', async () => {
    const open = vi.fn();
    await renderInApp(
      <Box className="w-[480px]" padding="lg">
        <NotificationItem onClick={open}>
          <NotificationItem.Description>A notification</NotificationItem.Description>
        </NotificationItem>
      </Box>,
    );

    const primary = page.getByRole('button', { name: 'A notification' });
    await userEvent.tab();
    await expect.element(primary).toHaveFocus();
    const bounds = primary.element().getBoundingClientRect();
    expect(bounds.width).toBeGreaterThan(400);
    expect(bounds.height).toBeGreaterThan(20);

    await userEvent.keyboard('{Enter}');
    expect(open).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(' ');
    expect(open).toHaveBeenCalledTimes(2);

    await page.elementLocator(primary.element().parentElement!).click({
      position: { x: -8, y: bounds.height / 2 },
    });
    expect(open).toHaveBeenCalledTimes(3);
  });

  it('keeps secondary controls outside the primary button and independent', async () => {
    const open = vi.fn();
    const follow = vi.fn();
    await renderInApp(
      <Box className="w-[480px]" padding="lg">
        <NotificationItem onClick={open}>
          <NotificationItem.Description>A notification</NotificationItem.Description>
          <Button onClick={follow}>Follow</Button>
          <Button>Show all</Button>
          <Button>Hide</Button>
        </NotificationItem>
      </Box>,
    );

    const secondary = page.getByRole('button', { name: 'Follow', exact: true });
    await expect
      .element(page.getByRole('button', { name: 'A notification', exact: true }))
      .toHaveAccessibleName('A notification');
    expect(secondary.element().parentElement?.closest('button, [role="button"]')).toBeNull();
    await secondary.click();
    expect(follow).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });
});
