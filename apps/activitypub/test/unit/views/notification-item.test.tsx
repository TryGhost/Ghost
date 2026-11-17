import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NotificationItem from '../../../src/views/notifications/components/notification-item';

afterEach(cleanup);

describe('notification row actions', () => {
  it('activates the primary action with Enter and Space', () => {
    const openNotification = vi.fn();
    render(<NotificationItem onClick={openNotification}>A notification</NotificationItem>);

    const row = screen.getByRole('button', { name: 'A notification' });
    expect(row.tabIndex).toBe(0);
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(openNotification).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(row, { key: ' ' });
    expect(openNotification).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(row, { key: ' ' });
    expect(openNotification).toHaveBeenCalledTimes(2);
  });

  it('keeps secondary controls independent from the row action', () => {
    const openNotification = vi.fn();
    const follow = vi.fn();
    render(
      <NotificationItem onClick={openNotification}>
        A notification
        <button type="button" onClick={follow}>
          Follow
        </button>
      </NotificationItem>,
    );

    const control = screen.getByRole('button', { name: 'Follow' });
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
});
