import { expect, it, vi } from 'vitest';

import { IframePreviewDocumentSurface } from './preview-document';

it.each([false, true])(
  'forwards canvas navigation from a real sandbox only when opted in: %s',
  async (enabled) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:390px;height:844px';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation: enabled });
    const input = vi.fn();
    surface.onCanvasInput(input);
    const signal = new AbortController().signal;
    try {
      await surface.replaceDocument(
        {
          html: `<h1 id="result">Waiting</h1><script>
        window.addEventListener('message', (event) => {
          if (event.data !== 'canvas-test-input') return;
          const wheel = new WheelEvent('wheel', {ctrlKey:true,deltaY:-80,clientX:200,clientY:300,cancelable:true});
          document.dispatchEvent(wheel);
          document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape',cancelable:true}));
          document.getElementById('result').textContent = String(wheel.defaultPrevented);
        });
      </script>`,
          url: 'https://example.com/',
          revision: 'test-revision',
        },
        null,
        signal,
      );
      iframe.contentWindow!.postMessage('canvas-test-input', '*');
      await expect
        .poll(async () => (await surface.inspectElement({ selector: '#result' }, signal)).text)
        .toBe(String(enabled));
      expect(input.mock.calls).toEqual(
        enabled
          ? [[{ kind: 'zoom', x: 200, y: 300, deltaY: -80, deltaMode: 0 }], [{ kind: 'escape' }]]
          : [],
      );
      expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    } finally {
      surface.destroy();
      iframe.remove();
    }
  },
);
