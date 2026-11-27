import { afterEach, describe, expect, it, vi } from 'vitest';
import { openLeaseChannel, type LeaseSignal } from './lease-channel';

const taken: LeaseSignal = { type: 'taken', lease: 'post:1', from: 'tab-a' };

describe('openLeaseChannel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carries a signal to the other tabs, and not back to the one that sent it', async () => {
    const heardByA = vi.fn();
    const heardByB = vi.fn();
    const a = openLeaseChannel(heardByA);
    const b = openLeaseChannel(heardByB);
    try {
      a?.post(taken);
      await vi.waitFor(() => expect(heardByB).toHaveBeenCalledExactlyOnceWith(taken));
      expect(heardByA).not.toHaveBeenCalled();
    } finally {
      a?.close();
      b?.close();
    }
  });

  it('passes on nothing that is not a signal', async () => {
    const heard = vi.fn();
    const channel = openLeaseChannel(heard);
    const other = new BroadcastChannel('ghost-editor-lease');
    try {
      other.postMessage('taken');
      other.postMessage({ type: 'given', lease: 'post:1', from: 'tab-a' });
      other.postMessage({ type: 'taken', from: 'tab-a' });
      other.postMessage(taken);
      await vi.waitFor(() => expect(heard).toHaveBeenCalled());
      expect(heard).toHaveBeenCalledExactlyOnceWith(taken);
    } finally {
      channel?.close();
      other.close();
    }
  });

  it('opens nothing in a browser without the channel', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    expect(openLeaseChannel(vi.fn())).toBeNull();
  });
});
