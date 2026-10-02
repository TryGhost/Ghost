import { expect, it, vi } from 'vitest';

import { IframePreviewDocumentSurface } from './preview-document';

it.each([false, true])(
  'relays canvas inputs only from the committed document when navigation is enabled: %s',
  async (enabled) => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(
      iframe,
      enabled ? { canvasNavigation: true } : {},
    );
    const input = vi.fn();
    surface.onCanvasInput(input);
    const replacing = surface.replaceDocument(
      { html: '<h1>Hello</h1>', url: 'https://example.com/', revision: 'rev-1' },
      null,
      new AbortController().signal,
    );
    const script = new DOMParser()
      .parseFromString(iframe.srcdoc, 'text/html')
      .querySelector<HTMLScriptElement>('[data-builder-preview]')!;
    const identity = {
      channel: script.dataset.builderChannel,
      documentId: script.dataset.builderDocument,
    };
    const send = (data: object, source = iframe.contentWindow) =>
      window.dispatchEvent(new MessageEvent('message', { source, data: { ...identity, ...data } }));
    try {
      expect(script.dataset.builderCanvasNavigation).toBe(String(enabled));
      send({ type: 'canvas-input', input: { kind: 'escape' } });
      expect(input).not.toHaveBeenCalled();
      const commands = new MessageChannel();
      window.dispatchEvent(
        new MessageEvent('message', {
          source: iframe.contentWindow,
          data: { ...identity, type: 'command-port' },
          ports: [commands.port1],
        }),
      );
      send({ type: 'ready', selection: null });
      send({ type: 'loaded' });
      await replacing;
      send({ type: 'canvas-input', input: { kind: 'escape' } }, window);
      send({ type: 'canvas-input', documentId: 'stale', input: { kind: 'escape' } });
      send({
        type: 'canvas-input',
        input: { kind: 'zoom', x: NaN, y: 0, deltaY: 1, deltaMode: 0 },
      });
      expect(input).not.toHaveBeenCalled();
      send({
        type: 'canvas-input',
        input: { kind: 'zoom', x: 200, y: 300, deltaY: -80, deltaMode: 0 },
      });
      send({ type: 'canvas-input', input: { kind: 'escape' } });
      expect(input.mock.calls).toEqual(
        enabled
          ? [[{ kind: 'zoom', x: 200, y: 300, deltaY: -80, deltaMode: 0 }], [{ kind: 'escape' }]]
          : [],
      );
    } finally {
      surface.destroy();
      iframe.remove();
    }
  },
);
