import { ShadeApp } from '@tryghost/shade/app';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NotificationItem from '../../../src/views/notifications/components/notification-item';

afterEach(cleanup);

describe('notification row actions', () => {
  it('exposes a native primary button labelled by the notification', () => {
    const openNotification = vi.fn();
    render(
      <NotificationItem onClick={openNotification}>
        <NotificationItem.Description>A notification</NotificationItem.Description>
      </NotificationItem>,
    );

    const action = screen.getByRole('button', { name: 'A notification' });
    expect(action.tagName).toBe('BUTTON');
    expect(action.tabIndex).toBe(0);
    fireEvent.click(action);
    expect(openNotification).toHaveBeenCalledTimes(1);
  });

  it('keeps secondary controls independent from the row action', () => {
    const openNotification = vi.fn();
    const follow = vi.fn();
    render(
      <NotificationItem onClick={openNotification}>
        <NotificationItem.Description>A notification</NotificationItem.Description>
        <button type="button" onClick={follow}>
          Follow
        </button>
      </NotificationItem>,
    );

    const control = screen.getByRole('button', { name: 'Follow' });
    expect(screen.getByRole('button', { name: 'A notification' })).toBeTruthy();
    expect(control.parentElement?.closest('button, [role="button"]')).toBeNull();
    fireEvent.keyDown(control, { key: 'Enter' });
    fireEvent.keyUp(control, { key: ' ' });
    fireEvent.click(control);

    expect(follow).toHaveBeenCalledTimes(1);
    expect(openNotification).not.toHaveBeenCalled();
  });

  it('does not give a static notification a primary action or tab stop', () => {
    render(<NotificationItem>A static notification</NotificationItem>);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('A static notification').tabIndex).toBe(-1);
  });

  it('preserves the legacy role, click behavior and missing tab stop with admin7Design off', () => {
    const openNotification = vi.fn();
    render(
      <ShadeApp admin7Design={false} darkMode={false}>
        <NotificationItem onClick={openNotification}>
          <NotificationItem.Description>A notification</NotificationItem.Description>
        </NotificationItem>
      </ShadeApp>,
    );
    const row = screen.getByRole('button', { name: 'A notification' });
    expect(row.tagName).toBe('DIV');
    expect(row.tabIndex).toBe(-1);
    expect(row.querySelector('button')).toBeNull();
    expect(row.hasAttribute('aria-labelledby')).toBe(false);
    expect(screen.getByText('A notification').id).toBe('');
    fireEvent.click(row);
    expect(openNotification).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(openNotification).toHaveBeenCalledTimes(1);
  });
});
