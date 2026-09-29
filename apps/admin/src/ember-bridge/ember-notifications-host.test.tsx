import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { createAlertsStore } from '@/alerts';
import { createEmberNotificationsHost } from './ember-notifications-host';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

type ToastOptions = { id: string; onDismiss: () => void; onAutoClose: () => void };

function lastToastOptions(method: keyof typeof toast): ToastOptions {
  const mock = vi.mocked(toast[method] as (title: unknown, options: ToastOptions) => void);
  return mock.mock.lastCall![1];
}

function setup() {
  const alerts = createAlertsStore();
  const host = createEmberNotificationsHost(alerts);
  const messages = () => alerts.getSnapshot().map((alert) => alert.message);
  return { alerts, host, messages };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createEmberNotificationsHost', () => {
  it('sends alerts to the store and toasts to Sonner by type', () => {
    const { host, messages } = setup();

    host.show({ status: 'alert', type: 'error', message: 'Saving failed' });
    host.show({ status: 'notification', type: 'success', message: 'Saved' });
    host.show({ status: 'notification', type: 'error', message: 'Failed' });
    host.show({ status: 'notification', type: 'warn', message: 'Careful' });
    host.show({ status: 'notification', type: 'info', message: 'FYI' });
    host.show({ status: 'notification', message: 'Untyped' });

    expect(messages()).toEqual(['Saving failed']);
    expect(toast.success).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledOnce();
    expect(toast.warning).toHaveBeenCalledOnce();
    expect(toast.info).toHaveBeenCalledOnce();
  });

  it('replaces messages sharing a noun.verb key base with the same status', () => {
    const { host, messages } = setup();

    host.show({ status: 'alert', type: 'error', message: 'First', key: 'post.save.failed' });
    host.show({ status: 'alert', type: 'error', message: 'Other', key: 'snippet.save' });
    host.show({ status: 'alert', type: 'error', message: 'Second', key: 'post.save.retry' });

    expect(messages()).toEqual(['Other', 'Second']);
  });

  it('replaces any message with identical text, whatever its status', () => {
    const { host, messages } = setup();

    host.show({ status: 'notification', message: 'Same text' });
    const toastId = lastToastOptions('success').id;
    host.show({ status: 'alert', type: 'error', message: { html: 'Same text' } });

    expect(toast.dismiss).toHaveBeenCalledExactlyOnceWith(toastId);
    expect(messages()).toEqual([{ html: 'Same text' }]);
  });

  it('removes alerts by key base, or all of them without a key', () => {
    const { alerts, host, messages } = setup();
    alerts.show({ message: 'Server notice', key: 'bottom' });
    host.show({ status: 'alert', message: 'Save failed', key: 'post.save' });
    host.show({ status: 'alert', message: 'API error', key: 'api-error.post.save' });

    host.remove('alert', 'post.save');
    expect(messages()).toEqual(['Server notice', 'API error']);

    host.remove('alert');
    expect(messages()).toEqual([]);
  });

  it('dismisses only its own toasts, matched by key base', () => {
    const { host } = setup();
    host.show({ status: 'notification', message: 'Password updated', key: 'user.password.done' });
    const keyed = lastToastOptions('success').id;
    host.show({ status: 'notification', message: 'Unkeyed' });

    host.remove('notification', 'user.password');

    expect(toast.dismiss).toHaveBeenCalledExactlyOnceWith(keyed);
  });

  it('forgets toasts once Sonner closes them', () => {
    const { host } = setup();
    host.show({ status: 'notification', message: 'Auto closed' });
    lastToastOptions('success').onAutoClose();
    host.show({ status: 'notification', message: 'Closed by user' });
    lastToastOptions('success').onDismiss();

    host.clearAll();

    expect(toast.dismiss).not.toHaveBeenCalled();
  });

  it('clears every alert and its own toasts without running onClose', () => {
    const { alerts, host, messages } = setup();
    const onClose = vi.fn();
    alerts.show({ message: 'Server notice', onClose });
    host.show({ status: 'notification', message: 'Saved' });
    const toastId = lastToastOptions('success').id;

    host.clearAll();

    expect(messages()).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
    expect(toast.dismiss).toHaveBeenCalledExactlyOnceWith(toastId);
  });

  it('never reuses toast ids across hosts', () => {
    setup().host.show({ status: 'notification', message: 'One' });
    const first = lastToastOptions('success').id;
    setup().host.show({ status: 'notification', message: 'Two' });

    expect(lastToastOptions('success').id).not.toBe(first);
  });
});
