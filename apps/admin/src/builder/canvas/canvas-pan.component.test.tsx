import { useEffect, useRef } from 'react';
import { expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';
import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { CanvasBoard } from './canvas-board';
import type { CanvasFrameInput } from './canvas-board';

type Action =
  | { kind: 'move'; x: number; y: number }
  | { kind: 'down' | 'up' | 'space-down' | 'space-up' | 'escape' };
declare module 'vitest/browser' {
  interface BrowserCommands {
    canvasPointer: (actions: Action[]) => Promise<void>;
    canvasInputValue: (title: string, label: string) => Promise<string>;
    canvasFocusInput: (title: string, label: string) => Promise<void>;
    canvasPointerViewport: (enabled: boolean) => Promise<void>;
  }
}
const frames = [
  { id: 'home', label: 'Home', group: 'Home', x: 0, y: 0, width: 800, height: 900 },
  { id: 'post', label: 'Post', group: 'Post', x: 848, y: 0, width: 390, height: 844 },
];
const surfaces = new Map<string, IframePreviewDocumentSurface>();
function Preview({ id, onInput }: { id: string; onInput: (input: CanvasFrameInput) => void }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const handler = useRef(onInput);
  handler.current = onInput;
  useEffect(() => {
    const surface = new IframePreviewDocumentSurface(iframe.current!, {
      canvasNavigation: true,
      canvasPanning: false,
    });
    surfaces.set(id, surface);
    surface.onCanvasInput((input) => handler.current(input));
    const controller = new AbortController();
    void surface
      .replaceDocument(
        {
          html: `<style>body{margin:0}h1,p,input{margin:24px}h1{font:32px sans-serif}p{height:150px}main{height:2000px}</style><main><h1 data-edit="index.hbs:1:1">Editable heading</h1><p>Pan target</p><input aria-label="Theme input"></main>
            <script>window.addEventListener('message', event => {
              if (event.data === 'test-synthetic-down') {
                document.querySelector('p').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
              }
              if (event.data === 'test-dialog') {
                document.body.insertAdjacentHTML('beforeend', '<dialog open style="position:fixed;top:0"><h2 tabindex="0">Dialog content</h2></dialog>');
                document.querySelector('dialog h2').focus();
              }
            });</script>`,
          url: 'https://example.com/',
          revision: 'pan-1',
          inlineTextTargets: { 'index.hbs:1:1': 'h1' },
        },
        null,
        controller.signal,
      )
      .then(() => surface.setInteractionMode('edit', controller.signal))
      .then(() => {
        iframe.current!.dataset.ready = 'true';
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          throw error;
        }
      });
    return () => {
      controller.abort();
      surface.destroy();
      surfaces.delete(id);
    };
  }, [id]);
  return (
    <iframe
      ref={iframe}
      style={{ width: '100%', height: '100%', border: 0 }}
      title={`${id} live`}
    />
  );
}
function camera() {
  const transform = (page.getByTestId('canvas-world').element() as HTMLElement).style.transform;
  const matrix = new DOMMatrix(transform);
  return { x: matrix.m41, y: matrix.m42, scale: matrix.m11 };
}
async function mount() {
  await commands.canvasPointerViewport(true);
  const screen = await renderInApp(
    <Box style={{ width: 1000, height: 720 }}>
      <CanvasBoard
        frames={frames}
        renderFrame={(frame, onInput) => <Preview id={frame.id} onInput={onInput} />}
      />
    </Box>,
  );
  await expect.poll(() => document.querySelectorAll('iframe[data-ready="true"]').length).toBe(2);
  return screen;
}
async function cleanup() {
  await commands.canvasPointer([{ kind: 'up' }, { kind: 'space-up' }]);
  await commands.canvasPointerViewport(false);
}

it.each(['board', 'frame', 'frame-capture'] as const)(
  'pans from %s across frame boundaries without selection, scroll or document replacement',
  async (origin) => {
    const screen = await mount();
    try {
      await page.getByRole('button', { name: 'Home', exact: true }).click();
      const signal = new AbortController().signal;
      const beforeLayouts = await Promise.all(
        [...surfaces.values()].map((surface) => surface.measureLayout(signal)),
      );
      const beforeFrames = [...document.querySelectorAll('iframe')];
      const frame = page.frameLocator(page.getByTitle('home live'));
      if (origin === 'board') {
        (page.getByRole('region', { name: 'Theme canvas' }).element() as HTMLElement).focus();
      } else {
        await frame.getByText('Pan target', { exact: true }).click();
      }
      await commands.canvasPointer([{ kind: 'space-down' }]);
      await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
      if (origin === 'frame-capture') {
        // Cover the race before the parent's arm shield becomes hittable:
        // the iframe must capture and relay the gesture itself.
        (document.querySelector('[data-canvas-pan-shield]') as HTMLElement).style.pointerEvents =
          'none';
      }
      const bounds = page.getByTitle('home live').element().getBoundingClientRect();
      const point = { x: bounds.left + bounds.width / 2, y: bounds.top + 100 };
      const before = camera();
      await commands.canvasPointer([
        { kind: 'move', ...point },
        { kind: 'down' },
        { kind: 'move', x: point.x + 500, y: point.y + 120 },
        { kind: 'up' },
        { kind: 'space-up' },
      ]);
      await expect.poll(() => camera().x - before.x).toBeCloseTo(500, 3);
      expect(camera().y - before.y).toBeCloseTo(120, 3);
      expect(camera().scale).toBe(before.scale);
      await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).toBeNull();
      await expect
        .element(page.getByRole('button', { name: 'Home', exact: true }))
        .toHaveAttribute('aria-pressed', 'true');
      const afterLayouts = await Promise.all(
        [...surfaces.values()].map((surface) => surface.measureLayout(signal)),
      );
      expect(afterLayouts.map((layout) => layout.documentInstanceId)).toEqual(
        beforeLayouts.map((layout) => layout.documentInstanceId),
      );
      expect(afterLayouts.map((layout) => layout.viewport)).toEqual(
        beforeLayouts.map((layout) => layout.viewport),
      );
      expect([...document.querySelectorAll('iframe')]).toEqual(beforeFrames);
    } finally {
      await cleanup();
      await screen.unmount();
    }
  },
);

it('leaves Space as text inside theme controls and a retained inline draft', async () => {
  const screen = await mount();
  try {
    const frame = page.frameLocator(page.getByTitle('home live'));
    const input = frame.getByRole('textbox', { name: 'Theme input' });
    await input.click();
    const before = camera();
    await commands.canvasPointer([{ kind: 'space-down' }, { kind: 'space-up' }]);
    expect(document.querySelector('[data-canvas-pan-shield]')).toBeNull();
    expect(camera()).toEqual(before);
    expect(await commands.canvasInputValue('home live', 'Theme input')).toBe(' ');
    await frame.getByRole('heading', { name: 'Editable heading' }).dblClick();
    const editor = frame.getByRole('textbox', { name: 'Edit Editable heading' });
    await editor.fill('Retained');
    await commands.canvasPointer([{ kind: 'space-down' }, { kind: 'space-up' }]);
    await userEvent.keyboard('text');
    expect(document.querySelector('[data-canvas-pan-shield]')).toBeNull();
    expect(
      (
        await surfaces
          .get('home')!
          .inspectElement({ selector: '[role="textbox"]' }, new AbortController().signal)
      ).text,
    ).toBe('Retained text');
    await page.getByRole('button', { name: 'Fit all', exact: true }).click();
    await frame.getByText('Pan target', { exact: true }).click();
    await commands.canvasPointer([{ kind: 'space-down' }]);
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    const host = page
      .getByRole('region', { name: 'Theme canvas' })
      .element()
      .getBoundingClientRect();
    await commands.canvasPointer([
      { kind: 'move', x: host.left + 300, y: host.top + 250 },
      { kind: 'down' },
      { kind: 'move', x: host.left + 420, y: host.top + 300 },
      { kind: 'up' },
      { kind: 'space-up' },
    ]);
    expect(
      (
        await surfaces
          .get('home')!
          .inspectElement({ selector: '[role="textbox"]' }, new AbortController().signal)
      ).text,
    ).toBe('Retained text');
  } finally {
    await cleanup();
    await screen.unmount();
  }
});

it('cancels on Space release and Escape without clicking through, then permits a new gesture', async () => {
  const screen = await mount();
  try {
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    const host = page.getByRole('region', { name: 'Theme canvas' }).element() as HTMLElement;
    host.focus();
    const bounds = host.getBoundingClientRect();
    const point = { x: bounds.left + 300, y: bounds.top + 250 };
    await commands.canvasPointer([{ kind: 'space-down' }]);
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    await commands.canvasPointer([
      { kind: 'move', ...point },
      { kind: 'down' },
      { kind: 'move', x: point.x + 80, y: point.y + 30 },
      { kind: 'space-up' },
    ]);
    const released = camera();
    await commands.canvasPointer([
      { kind: 'move', x: point.x + 160, y: point.y + 60 },
      { kind: 'up' },
    ]);
    expect(camera()).toEqual(released);
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).toBeNull();
    await expect
      .element(page.getByRole('button', { name: 'Home', exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
    await commands.canvasPointer([{ kind: 'space-down' }]);
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    await commands.canvasPointer([
      { kind: 'move', ...point },
      { kind: 'down' },
      { kind: 'move', x: point.x + 80, y: point.y + 30 },
      { kind: 'escape' },
    ]);
    const escaped = camera();
    await commands.canvasPointer([
      { kind: 'move', x: point.x + 160, y: point.y + 60 },
      { kind: 'up' },
      { kind: 'space-up' },
    ]);
    expect(camera()).toEqual(escaped);
    await expect
      .element(page.getByRole('button', { name: 'Home', exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
    await commands.canvasPointer([{ kind: 'space-down' }]);
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    await commands.canvasPointer([
      { kind: 'move', ...point },
      { kind: 'down' },
      { kind: 'move', x: point.x + 40, y: point.y + 20 },
      { kind: 'up' },
      { kind: 'space-up' },
    ]);
    expect(camera().x - escaped.x).toBeCloseTo(40, 3);
  } finally {
    await cleanup();
    await screen.unmount();
  }
});

it.each(['board', 'frame'] as const)(
  'keeps Escape cancellation through held Space repeats in the %s',
  async (origin) => {
    const screen = await mount();
    try {
      if (origin === 'board') {
        (page.getByRole('region', { name: 'Theme canvas' }).element() as HTMLElement).focus();
      } else {
        await page
          .frameLocator(page.getByTitle('home live'))
          .getByText('Pan target', { exact: true })
          .click();
      }
      await commands.canvasPointer([{ kind: 'space-down' }]);
      await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
      await commands.canvasPointer([{ kind: 'escape' }, { kind: 'space-down' }]);
      await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).toBeNull();
      await commands.canvasPointer([{ kind: 'space-up' }, { kind: 'space-down' }]);
      await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    } finally {
      await cleanup();
      await screen.unmount();
    }
  },
);

it.each(['board', 'frame'] as const)(
  'preserves Space handling inside a native dialog in the %s',
  async (origin) => {
    const screen = await mount();
    try {
      const before = camera();
      if (origin === 'board') {
        const dialog = document.createElement('dialog');
        dialog.open = true;
        dialog.innerHTML = '<h2 tabindex="0">Dialog content</h2>';
        page.getByRole('region', { name: 'Theme canvas' }).element().append(dialog);
        (dialog.firstElementChild as HTMLElement).focus();
      } else {
        (page.getByTitle('home live').element() as HTMLIFrameElement).contentWindow!.postMessage(
          'test-dialog',
          '*',
        );
        await expect
          .poll(() =>
            surfaces
              .get('home')!
              .inspectElement({ selector: 'dialog h2' }, new AbortController().signal),
          )
          .toMatchObject({ text: 'Dialog content' });
      }
      await commands.canvasPointer([{ kind: 'space-down' }]);
      // Read the authenticated runtime after its key handler has executed.
      await surfaces.get('home')!.measureLayout(new AbortController().signal);
      expect(document.querySelector('[data-canvas-pan-shield]')).toBeNull();
      expect(camera()).toEqual(before);
    } finally {
      await cleanup();
      await screen.unmount();
    }
  },
);

it('keeps cancelled iframe clicks suppressed despite a theme synthetic pointerdown', async () => {
  const screen = await mount();
  try {
    const iframe = page.getByTitle('home live').element() as HTMLIFrameElement;
    const frame = page.frameLocator(page.getByTitle('home live'));
    await frame.getByText('Pan target', { exact: true }).click();
    await commands.canvasPointer([{ kind: 'space-down' }]);
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    (document.querySelector('[data-canvas-pan-shield]') as HTMLElement).style.pointerEvents =
      'none';
    const bounds = iframe.getBoundingClientRect();
    const heading = await surfaces
      .get('home')!
      .inspectElement({ selector: 'h1' }, new AbortController().signal);
    const point = {
      x: bounds.left + (heading.box.x + heading.box.width / 2) * camera().scale,
      y: bounds.top + (heading.box.y + heading.box.height / 2) * camera().scale,
    };
    const selected = vi.fn();
    const remove = surfaces.get('home')!.onSelection(selected);
    try {
      await commands.canvasPointer([
        { kind: 'move', ...point },
        { kind: 'down' },
        { kind: 'space-up' },
      ]);
      iframe.contentWindow!.postMessage('test-synthetic-down', '*');
      // A command on the same runtime drains the posted theme event before the physical release.
      await surfaces.get('home')!.measureLayout(new AbortController().signal);
      await commands.canvasPointer([{ kind: 'up' }]);
      await surfaces.get('home')!.measureLayout(new AbortController().signal);
      expect(selected).not.toHaveBeenCalled();
    } finally {
      remove();
    }
  } finally {
    await cleanup();
    await screen.unmount();
  }
});

it('retires pan ownership with the document and rejects global, malformed and obsolete port messages', async () => {
  const screen = await mount();
  try {
    const iframe = page.getByTitle('home live').element() as HTMLIFrameElement;
    const surface = surfaces.get('home')!;
    const bridge = surface as unknown as {
      commandPort: MessagePort;
      channel: string;
      committedDocumentId: string;
    };
    const oldPort = bridge.commandPort;
    const oldId = bridge.committedDocumentId;
    const packet = {
      channel: bridge.channel,
      documentId: oldId,
      type: 'canvas-pan',
      input: {
        kind: 'pan-key',
        active: true,
        interactionTime: performance.timeOrigin + performance.now(),
      },
    };
    for (const type of ['canvas-pan', 'canvas-input']) {
      window.dispatchEvent(
        new MessageEvent('message', { source: iframe.contentWindow, data: { ...packet, type } }),
      );
    }
    oldPort.dispatchEvent(
      new MessageEvent('message', {
        data: { ...packet, input: { ...packet.input, interactionTime: Infinity } },
      }),
    );
    expect(document.querySelector('[data-canvas-pan-shield]')).toBeNull();
    await page
      .frameLocator(page.getByTitle('home live'))
      .getByText('Pan target', { exact: true })
      .click();
    await commands.canvasPointer([{ kind: 'space-down' }]);
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    await surface.replaceDocument(
      { html: '<p>Replacement document</p>', url: 'https://example.com/', revision: 'pan-2' },
      null,
      new AbortController().signal,
    );
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).toBeNull();
    oldPort.dispatchEvent(
      new MessageEvent('message', {
        data: {
          ...packet,
          input: { ...packet.input, interactionTime: performance.timeOrigin + performance.now() },
        },
      }),
    );
    expect(document.querySelector('[data-canvas-pan-shield]')).toBeNull();
  } finally {
    await cleanup();
    await screen.unmount();
  }
});

it('supports repeated drags with one held Space key and releases it when a frame control receives focus', async () => {
  const screen = await mount();
  try {
    const frame = page.frameLocator(page.getByTitle('home live'));
    await frame.getByText('Pan target', { exact: true }).click();
    await commands.canvasPointer([{ kind: 'space-down' }]);
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    const bounds = page
      .getByRole('region', { name: 'Theme canvas' })
      .element()
      .getBoundingClientRect();
    const point = { x: bounds.left + 300, y: bounds.top + 250 };
    const before = camera();
    for (let index = 0; index < 2; index += 1) {
      await commands.canvasPointer([
        { kind: 'move', ...point },
        { kind: 'down' },
        { kind: 'move', x: point.x + 80, y: point.y + 30 },
        { kind: 'up' },
      ]);
      expect(document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    }
    expect(camera().x - before.x).toBeCloseTo(160, 3);
    expect(camera().y - before.y).toBeCloseTo(60, 3);
    await commands.canvasFocusInput('home live', 'Theme input');
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).toBeNull();
    await commands.canvasPointer([
      { kind: 'space-up' },
      { kind: 'space-down' },
      { kind: 'space-up' },
    ]);
    expect(await commands.canvasInputValue('home live', 'Theme input')).toBe(' ');
  } finally {
    await cleanup();
    await screen.unmount();
  }
});

it('cancels on lost pointer capture and window blur without leaving a shield or changing selection', async () => {
  const screen = await mount();
  try {
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    const host = page.getByRole('region', { name: 'Theme canvas' }).element() as HTMLElement;
    host.focus();
    const bounds = host.getBoundingClientRect();
    let pointerId = -1;
    host.addEventListener(
      'pointerdown',
      (event) => {
        pointerId = event.pointerId;
      },
      { once: true },
    );
    await commands.canvasPointer([{ kind: 'space-down' }]);
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    await commands.canvasPointer([
      { kind: 'move', x: bounds.left + 300, y: bounds.top + 250 },
      { kind: 'down' },
      { kind: 'move', x: bounds.left + 380, y: bounds.top + 280 },
    ]);
    const beforeLoss = camera();
    host.releasePointerCapture(pointerId);
    await commands.canvasPointer([
      { kind: 'move', x: bounds.left + 450, y: bounds.top + 320 },
      { kind: 'up' },
      { kind: 'space-up' },
    ]);
    expect(camera()).toEqual(beforeLoss);
    expect(document.querySelector('[data-canvas-pan-shield]')).toBeNull();
    await expect
      .element(page.getByRole('button', { name: 'Home', exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
    await commands.canvasPointer([{ kind: 'space-down' }]);
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).not.toBeNull();
    window.dispatchEvent(new FocusEvent('blur'));
    await expect.poll(() => document.querySelector('[data-canvas-pan-shield]')).toBeNull();
    expect(camera()).toEqual(beforeLoss);
  } finally {
    await cleanup();
    await screen.unmount();
  }
});
