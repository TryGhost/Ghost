import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSidePanelStore, type SidePanelSize } from './side-panel-store';

/** A size from content newer than this Admin. */
const unknownSize = 'sideways' as unknown as SidePanelSize;

describe('side panel store', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports an onClose that throws, and still replaces the content', () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    const store = createSidePanelStore();
    store.setAvailable(true);
    const error = new Error('onClose failed');
    const first = document.createElement('div');
    const second = document.createElement('div');
    store.open(first, {
      onClose: () => {
        throw error;
      },
    });

    store.open(second);

    expect(reportError).toHaveBeenCalledWith(error);
    expect(store.getState()).toMatchObject({ element: second, open: true });
  });

  it('opens at and resizes to the minimized size, which still counts as open', () => {
    const store = createSidePanelStore();
    store.setAvailable(true);
    store.setMinimizable(true);

    const handle = store.open(document.createElement('div'), { size: 'minimized' });
    expect(store.getState()).toMatchObject({ open: true, size: 'minimized' });

    handle?.setSize('default');
    expect(store.getState().size).toBe('default');
    handle?.setSize('minimized');
    expect(store.getState().size).toBe('minimized');
    expect(store.isOpen()).toBe(true);
  });

  it('ignores a size it does not know', () => {
    const store = createSidePanelStore();
    store.setAvailable(true);
    const listener = vi.fn();
    store.subscribe(listener);

    const handle = store.open(document.createElement('div'), { size: unknownSize });
    expect(store.getState().size).toBe('default');
    handle?.setSize('full');
    listener.mockClear();

    handle?.setSize(unknownSize);

    expect(store.getState().size).toBe('full');
    expect(listener).not.toHaveBeenCalled();
  });

  it('offers the minimized size only while minimizable, and keeps a minimized panel minimized', () => {
    const store = createSidePanelStore();
    store.setAvailable(true);

    expect(store.getSizes()).toEqual(['default', 'full']);
    const handle = store.open(document.createElement('div'), { size: 'minimized' });
    expect(store.getState().size).toBe('default');
    handle?.setSize('minimized');
    expect(store.getState().size).toBe('default');

    store.setMinimizable(true);
    expect(store.getSizes()).toEqual(['default', 'full', 'minimized']);
    expect(Object.isFrozen(store.getSizes())).toBe(true);
    handle?.setSize('minimized');
    expect(store.getState().size).toBe('minimized');

    store.setMinimizable(false);
    expect(store.getSizes()).toEqual(['default', 'full']);
    expect(store.getState().size).toBe('minimized');
    handle?.setSize('default');
    expect(store.getState().size).toBe('default');
  });

  it('tells the content that owns the panel when its sizes change, and nothing stale', () => {
    const store = createSidePanelStore();
    store.setAvailable(true);
    const first = vi.fn();
    const second = vi.fn();
    store.open(document.createElement('div'), { onSizesChange: first });

    store.setMinimizable(true);
    store.setMinimizable(true);
    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenLastCalledWith(['default', 'full', 'minimized']);

    store.open(document.createElement('div'), { onSizesChange: second });
    store.setMinimizable(false);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(['default', 'full']);

    store.close();
    store.setMinimizable(true);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('reports an onSizesChange that throws, and still changes its sizes', () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    const store = createSidePanelStore();
    store.setAvailable(true);
    const error = new Error('onSizesChange failed');
    const handle = store.open(document.createElement('div'), {
      onSizesChange: () => {
        throw error;
      },
    });

    store.setMinimizable(true);

    expect(reportError).toHaveBeenCalledWith(error);
    handle?.setSize('minimized');
    expect(store.getState().size).toBe('minimized');
  });
});
