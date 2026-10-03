import { afterEach, expect, it, vi } from 'vitest';
import { IframePreviewDocumentSurface } from './preview-document';

afterEach(() => vi.useRealTimers());

function fixture() {
  const iframe = document.createElement('iframe');
  const surface = new IframePreviewDocumentSurface(iframe, { timeoutMs: 1_000 });
  const diagnostics = vi.fn();
  const ports: MessagePort[] = [];
  surface.onDiagnostic(diagnostics);
  const acknowledge = () => {
    const script = new DOMParser()
      .parseFromString(iframe.srcdoc, 'text/html')
      .querySelector<HTMLScriptElement>('script[data-builder-preview]')!;
    const identity = {
      channel: script.dataset.builderChannel!,
      documentId: script.dataset.builderDocument!,
    };
    const commands = new MessageChannel();
    ports.push(commands.port2);
    const send = (data: object, transfer: MessagePort[] = []) =>
      window.dispatchEvent(
        new MessageEvent('message', {
          source: iframe.contentWindow,
          data: { ...identity, ...data },
          ports: transfer,
        }),
      );
    send({ type: 'command-port' }, [commands.port1]);
    send({ type: 'ready', selection: null });
    send({ type: 'loaded' });
  };
  const replace = (revision: string) =>
    surface.replaceDocument(
      {
        html: `<h1>${revision}</h1>`,
        url: 'https://example.com/',
        revision,
      },
      null,
      new AbortController().signal,
    );
  return {
    iframe,
    surface,
    diagnostics,
    acknowledge,
    replace,
    destroy: () => {
      surface.destroy();
      ports.forEach((port) => port.close());
    },
  };
}

it.each([0, 10, 90])(
  'detects a second load %sms after a valid load without reusing its receipt',
  async (delay) => {
    vi.useFakeTimers();
    const current = fixture();
    try {
      const ready = current.replace('accepted');
      current.acknowledge();
      await ready;
      current.iframe.dispatchEvent(new Event('load'));
      await vi.advanceTimersByTimeAsync(delay);
      current.iframe.dispatchEvent(new Event('load'));
      await vi.advanceTimersByTimeAsync(101);
      expect(current.diagnostics).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ code: 'preview_navigation_bypassed' }),
      );
      expect(current.iframe.srcdoc).toContain('<h1>accepted</h1>');
    } finally {
      current.destroy();
    }
  },
);

it('retires all earlier load checks when a bypass restores the same accepted document', async () => {
  vi.useFakeTimers();
  const current = fixture();
  try {
    const ready = current.replace('accepted');
    current.acknowledge();
    await ready;
    current.iframe.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(10);
    current.iframe.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(10);
    current.iframe.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(91);
    expect(current.diagnostics).toHaveBeenCalledTimes(1);
    current.acknowledge();
    current.iframe.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(101);
    expect(current.diagnostics).toHaveBeenCalledTimes(1);
    expect(current.iframe.srcdoc).toContain('<h1>accepted</h1>');
  } finally {
    current.destroy();
  }
});

it('does not let an old accepted load consume the receipt after aborted replacement restores it', async () => {
  vi.useFakeTimers();
  const current = fixture();
  try {
    const ready = current.replace('accepted');
    current.acknowledge();
    await ready;
    current.iframe.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(10);
    const abort = new AbortController();
    const pending = current.surface.replaceDocument(
      { html: '<h1>candidate</h1>', url: 'https://example.com/', revision: 'candidate' },
      null,
      abort.signal,
    );
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    abort.abort();
    await rejected;
    current.acknowledge();
    current.iframe.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(111);
    expect(current.diagnostics).not.toHaveBeenCalled();
    expect(current.iframe.srcdoc).toContain('<h1>accepted</h1>');
  } finally {
    current.destroy();
  }
});

it('clears every pending load check when the surface is destroyed', async () => {
  vi.useFakeTimers();
  const current = fixture();
  try {
    const ready = current.replace('accepted');
    current.acknowledge();
    await ready;
    current.iframe.dispatchEvent(new Event('load'));
    current.iframe.dispatchEvent(new Event('load'));
    current.destroy();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(101);
    expect(current.diagnostics).not.toHaveBeenCalled();
  } finally {
    current.destroy();
  }
});
