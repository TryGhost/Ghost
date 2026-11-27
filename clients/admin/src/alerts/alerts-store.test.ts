import { describe, expect, it, vi } from 'vitest';
import { createAlertsStore } from './alerts-store';

describe('createAlertsStore', () => {
  it('shows alerts in order with unique ids', () => {
    const store = createAlertsStore();

    const first = store.show({ message: 'First' });
    const second = store.show({ message: 'Second' });

    expect(first).not.toBe(second);
    expect(store.getSnapshot().map((alert) => alert.message)).toEqual(['First', 'Second']);
  });

  it('runs onClose when the user closes an alert', () => {
    const store = createAlertsStore();
    const onClose = vi.fn();
    const id = store.show({ message: 'Notice', onClose });

    store.close(id);
    store.close(id);

    expect(store.getSnapshot()).toEqual([]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('never runs onClose on programmatic removal', () => {
    const store = createAlertsStore();
    const onClose = vi.fn();
    store.show({ message: 'Notice', key: 'bottom', onClose });
    store.show({ message: 'Save failed', key: 'post.save' });

    store.remove((alert) => alert.key === 'bottom');

    expect(store.getSnapshot().map((alert) => alert.message)).toEqual(['Save failed']);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the snapshot and skips listeners when nothing changes', () => {
    const store = createAlertsStore();
    store.show({ message: 'Notice' });
    const snapshot = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);

    store.remove(() => false);
    store.close('missing');

    expect(store.getSnapshot()).toBe(snapshot);
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies subscribers until they unsubscribe', () => {
    const store = createAlertsStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.show({ message: 'One' });
    unsubscribe();
    store.show({ message: 'Two' });

    expect(listener).toHaveBeenCalledOnce();
  });
});
