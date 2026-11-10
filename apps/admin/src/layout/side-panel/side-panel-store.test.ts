import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSidePanelStore } from './side-panel-store';

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
});
