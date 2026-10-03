import { useEffect, useRef } from 'react';
import { expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';

import { renderInApp } from '@test-utils/acceptance/render-in-app';
import {
  fakeFrameImage,
  getFrameImageRequests,
  releaseFrameImages,
} from '@test-utils/acceptance/frames';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { CanvasBoard } from './canvas-board';
import type { CanvasFrameInput } from './canvas-board';
import type {
  PreviewInlineEditRequest,
  PreviewInlineEditResult,
} from '@/builder/workspaces/theme/preview/preview-document';

const frames = [
  { id: 'home', label: 'Home · Desktop', group: 'Home', x: 0, y: 0, width: 1440, height: 900 },
  { id: 'mobile', label: 'Home · Mobile', group: 'Home', x: 1488, y: 0, width: 390, height: 844 },
];
const html =
  '<style>body{margin:0}h1{font:32px sans-serif;margin:24px}a{display:block;margin:24px}</style><h1 data-edit="index.hbs:1:1">Initial heading</h1><a data-edit="index.hbs:2:1" href="/other/">Other text</a>';
const surfaces = new WeakMap<
  HTMLIFrameElement,
  { surface: IframePreviewDocumentSurface; ready: Promise<unknown> }
>();
async function preview(element: HTMLIFrameElement) {
  const state = surfaces.get(element)!;
  await state.ready;
  return { surface: state.surface, frame: page.frameLocator(page.elementLocator(element)) };
}
async function expectText(surface: IframePreviewDocumentSurface, selector: string, text: string) {
  await expect
    .poll(
      async () => (await surface.inspectElement({ selector }, new AbortController().signal)).text,
    )
    .toBe(text);
}
function Preview({
  onInput,
  onEdit,
  canvas = true,
  inlineImageEditing = true,
  id = 'default',
  content = html,
}: {
  onInput: (input: CanvasFrameInput) => void;
  onEdit: (edit: PreviewInlineEditRequest) => Promise<PreviewInlineEditResult>;
  canvas?: boolean;
  inlineImageEditing?: boolean;
  id?: string;
  content?: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const input = useRef(onInput);
  input.current = onInput;
  useEffect(() => {
    const surface = new IframePreviewDocumentSurface(frame.current!, {
      canvasNavigation: canvas,
      inlineImageEditing,
    });
    surface.onCanvasInput((value) => input.current(value));
    surface.onInlineEdit(onEdit);
    const controller = new AbortController();
    const ready = surface.setInlineEditMode(true, controller.signal).then(() =>
      surface.replaceDocument(
        {
          html: content,
          url: 'https://site.example/',
          revision: 'inline-draft-1',
          inlineTextTargets: { 'index.hbs:1:1': 'h1', 'index.hbs:2:1': 'a' },
        },
        null,
        controller.signal,
      ),
    );
    surfaces.set(frame.current!, { surface, ready });
    void ready.catch((error) => {
      if (!controller.signal.aborted) {
        throw error;
      }
    });
    return () => {
      controller.abort();
      surface.destroy();
    };
  }, [onEdit, canvas, content, inlineImageEditing]);
  return (
    <iframe
      ref={frame}
      style={{ width: '100%', height: '100%', border: 0 }}
      title={`${id} draft preview`}
    />
  );
}

it('preserves real uncommitted text through direct canvas editing, zoom, pan and camera fits', async () => {
  const edit = vi.fn().mockResolvedValue({ ok: true });
  await renderInApp(
    <Box style={{ width: 1100, height: 650 }}>
      <CanvasBoard
        frames={frames}
        renderFrame={(target, input) => <Preview id={target.id} onEdit={edit} onInput={input} />}
      />
    </Box>,
  );
  const world = page.getByTestId('canvas-world').element() as HTMLElement;
  await page.getByRole('button', { name: 'Home · Desktop', exact: true }).dblClick();
  const { surface, frame } = await preview(
    document.querySelector('[data-canvas-frame="home"] iframe')!,
  );
  const signal = new AbortController().signal;
  const layout = await surface.measureLayout(signal);
  expect(layout.viewport).toMatchObject({ width: 1440, height: 900 });
  await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
  const editor = frame.getByRole('textbox', { name: 'Edit Initial heading' });
  await editor.fill('A kept manual draft');
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expectText(surface, '[role="textbox"]', 'A kept manual draft');
  expect(world.style.transform).toContain('scale(1)');
  await page.getByRole('region', { name: 'Theme canvas' }).click({ position: { x: 10, y: 500 } });
  await userEvent.keyboard('{ArrowRight}');
  await expectText(surface, '[role="textbox"]', 'A kept manual draft');
  await page.getByRole('button', { name: 'Fit all' }).click();
  expect(world.style.transform).toContain('scale(1)');
  const box = (await surface.inspectElement({ selector: '[role="textbox"]' }, signal)).box;
  const card = document.querySelector('[data-canvas-frame="home"]')!.getBoundingClientRect();
  const board = page.getByRole('region', { name: 'Theme canvas' }).element();
  const bounds = board.getBoundingClientRect();
  board.dispatchEvent(
    new WheelEvent('wheel', {
      bubbles: true,
      deltaX: card.x + box.x + box.width / 2 - bounds.x - bounds.width / 2,
      deltaY: card.y + box.y + box.height / 2 - bounds.y - bounds.height / 2,
    }),
  );
  await expectText(surface, '[role="textbox"]', 'A kept manual draft');
  expect(world.style.transform).toContain('scale(1)');
  expect(edit).not.toHaveBeenCalled();
  expect(await surface.measureLayout(signal)).toMatchObject({
    documentId: layout.documentId,
    documentInstanceId: layout.documentInstanceId,
    viewport: layout.viewport,
    document: layout.document,
  });
  await editor.click();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => edit.mock.calls.length).toBe(1);
  expect(edit.mock.calls[0][0]).toMatchObject({
    kind: 'text',
    newText: 'A kept manual draft',
    marker: 'index.hbs:1:1',
  });
  await expectText(surface, 'h1', 'A kept manual draft');
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  expect(world.style.transform).toContain('scale(0.8)');
});

it('keeps a canvas draft on Tab, another target and a rejected explicit commit, then cancels on Escape', async () => {
  const edit = vi.fn().mockResolvedValue({ ok: false, message: 'Source changed.' });
  await renderInApp(
    <Box style={{ width: 600, height: 650 }}>
      <Preview onEdit={edit} onInput={() => {}} />
    </Box>,
  );
  const { surface, frame } = await preview(
    document.querySelector('iframe[title="default draft preview"]')!,
  );
  await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
  const editor = frame.getByRole('textbox', { name: 'Edit Initial heading' });
  await editor.fill('Do not commit on focus');
  await userEvent.keyboard('{Tab}');
  await expectText(surface, '[role="textbox"]', 'Do not commit on focus');
  await frame.getByRole('link', { name: 'Other text' }).click();
  expect(edit).not.toHaveBeenCalled();
  await editor.click();
  await userEvent.keyboard('{Enter}');
  await expectText(surface, '[role="alert"]', 'Source changed.');
  await expectText(surface, '[role="textbox"]', 'Do not commit on focus');
  await frame.getByRole('link', { name: 'Other text' }).click();
  await userEvent.keyboard('{Escape}');
  await expectText(surface, 'h1', 'Initial heading');
  expect(edit).toHaveBeenCalledTimes(1);
});

it('retains the existing non-canvas blur cancellation behavior', async () => {
  const edit = vi.fn().mockResolvedValue({ ok: true });
  await renderInApp(
    <Box style={{ width: 600, height: 650 }}>
      <button type="button">Parent action</button>
      <Preview canvas={false} onEdit={edit} onInput={() => {}} />
    </Box>,
  );
  const { surface, frame } = await preview(
    document.querySelector('iframe[title="default draft preview"]')!,
  );
  await frame.getByRole('heading', { name: 'Initial heading' }).click();
  const editor = frame.getByRole('textbox', { name: 'Edit Initial heading' });
  await editor.fill('Legacy temporary draft');
  await page.getByRole('button', { name: 'Parent action' }).click();
  await expectText(surface, 'h1', 'Initial heading');
  expect(edit).not.toHaveBeenCalled();
});

it('does not let a theme script cancel a manual draft with synthetic Escape', async () => {
  const edit = vi.fn().mockResolvedValue({ ok: true });
  await renderInApp(
    <Box style={{ width: 600, height: 650 }}>
      <Preview
        content={`${html}<script>window.addEventListener('message', event => {if(event.data === 'test-synthetic-escape') {document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', cancelable:true, bubbles:true})); document.body.dataset.testEscape = 'done';}});</script>`}
        onEdit={edit}
        onInput={() => {}}
      />
    </Box>,
  );
  const element = document.querySelector(
    'iframe[title="default draft preview"]',
  ) as HTMLIFrameElement;
  const { surface, frame } = await preview(element);
  await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
  await frame.getByRole('textbox').fill('Untrusted Escape cannot cancel');
  element.contentWindow!.postMessage('test-synthetic-escape', '*');
  await expectText(
    surface,
    'body[data-test-escape="done"] [role="textbox"]',
    'Untrusted Escape cannot cancel',
  );
  expect(edit).not.toHaveBeenCalled();
});

it('waits for committed readiness before starting an inline editor or submitting text', async () => {
  const url = 'https://site.example/held-inline-image.png';
  await fakeFrameImage(
    url,
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=',
    false,
    true,
  );
  const inputs = vi.fn<(input: CanvasFrameInput) => void>();
  const edit = vi.fn().mockResolvedValue({ ok: true });
  await renderInApp(
    <Box style={{ width: 600, height: 650 }}>
      <Preview
        content={`${html}<img src="${url}" alt="Pending image">`}
        onEdit={edit}
        onInput={inputs}
      />
    </Box>,
  );
  const element = document.querySelector(
    'iframe[title="default draft preview"]',
  ) as HTMLIFrameElement;
  const state = surfaces.get(element)!;
  const frame = page.frameLocator(page.elementLocator(element));
  let committed = false;
  void state.ready.then(() => {
    committed = true;
  });
  await expect.poll(getFrameImageRequests).toContain(url);
  expect(committed).toBe(false);
  await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
  await userEvent.keyboard('Before readiness{Enter}');
  expect(edit).not.toHaveBeenCalled();
  await releaseFrameImages();
  await state.ready;
  await expectText(state.surface, 'h1', 'Initial heading');
  expect(inputs).not.toHaveBeenCalled();
  await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
  const editor = frame.getByRole('textbox');
  await editor.fill('After readiness');
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => edit.mock.calls.length).toBe(1);
  await expectText(state.surface, 'h1', 'After readiness');
});

it('clears canvas draft activity when blocked navigation restores the committed document', async () => {
  const inputs = vi.fn<(input: CanvasFrameInput) => void>();
  const edit = vi.fn().mockResolvedValue({ ok: true });
  await renderInApp(
    <Box style={{ width: 600, height: 650 }}>
      <Preview
        content={`${html}<script>window.addEventListener('message', event => {if(event.data === 'test-blocked-navigation') location.href = 'about:blank';});</script>`}
        onEdit={edit}
        onInput={inputs}
      />
    </Box>,
  );
  const element = document.querySelector(
    'iframe[title="default draft preview"]',
  ) as HTMLIFrameElement;
  const { surface, frame } = await preview(element);
  const diagnostic = vi.fn();
  surface.onDiagnostic(diagnostic);
  // Isolate restoration cleanup after the existing initial-load navigation guard.
  // Rapid consecutive loads have a separate baseline guard race, not covered here.
  await new Promise((resolve) => {
    setTimeout(resolve, 150);
  });
  await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
  await frame.getByRole('textbox').fill('A draft before blocked navigation');
  await expect
    .poll(() => inputs.mock.calls.at(-1)?.[0])
    .toMatchObject({
      kind: 'inline-edit',
      draft: { newText: 'A draft before blocked navigation' },
    });
  expect(inputs.mock.calls.at(-1)?.[0]).not.toMatchObject({ kind: 'inline-edit', box: null });
  element.contentWindow!.postMessage('test-blocked-navigation', '*');
  await expect.poll(() => diagnostic.mock.calls.length).toBeGreaterThan(0);
  await expectText(surface, 'h1', 'Initial heading');
  await expect
    .poll(() => inputs.mock.calls.at(-1)?.[0])
    .toEqual({ kind: 'inline-edit', box: null, retired: true });
  expect(edit).not.toHaveBeenCalled();
});

it('keeps pending text visible until an explicit commit completes, including after Escape', async () => {
  let finish!: (result: PreviewInlineEditResult) => void;
  const edit = vi.fn(
    () =>
      new Promise<PreviewInlineEditResult>((resolve) => {
        finish = resolve;
      }),
  );
  await renderInApp(
    <Box style={{ width: 600, height: 650 }}>
      <Preview onEdit={edit} onInput={() => {}} />
    </Box>,
  );
  const { surface, frame } = await preview(
    document.querySelector('iframe[title="default draft preview"]')!,
  );
  await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
  const editor = frame.getByRole('textbox', { name: 'Edit Initial heading' });
  await editor.fill('Pending manual text');
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => edit.mock.calls.length).toBe(1);
  await frame.getByRole('link', { name: 'Other text' }).click();
  await userEvent.keyboard('{Escape}');
  await expectText(surface, '[role="textbox"]', 'Pending manual text');
  await expect(surface.cancelInlineTextEdit(new AbortController().signal)).rejects.toMatchObject({
    code: 'inline_edit_pending',
  });
  finish({ ok: false, message: 'Commit rejected.' });
  await expectText(surface, '[role="alert"]:last-child', 'Commit rejected.');
  await expectText(surface, '[role="textbox"]', 'Pending manual text');
  await editor.click();
  await userEvent.keyboard('{Escape}');
  await expectText(surface, 'h1', 'Initial heading');
});

it('fits and commits a literal below 10000 CSS pixels in a live composition', async () => {
  const edit = vi.fn().mockResolvedValue({ ok: true });
  const inputs = vi.fn<(input: CanvasFrameInput) => void>();
  await renderInApp(
    <Box style={{ width: 1100, height: 650 }}>
      <CanvasBoard
        frames={[{ ...frames[1], id: 'long', x: 0, height: 16000 }]}
        renderFrame={(target, onInput) => (
          <Preview
            content={html.replace('margin:24px', 'margin:12000px 24px 24px')}
            id={target.id}
            onEdit={edit}
            onInput={(input) => {
              inputs(input);
              onInput(input);
            }}
          />
        )}
      />
    </Box>,
  );
  const { surface, frame } = await preview(
    document.querySelector('iframe[title="long draft preview"]')!,
  );
  await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
  await expect
    .poll(() =>
      inputs.mock.calls.some(
        ([input]) => input.kind === 'inline-edit' && input.box && input.box.y >= 12000,
      ),
    )
    .toBe(true);
  await expect
    .poll(() => (page.getByTestId('canvas-world').element() as HTMLElement).style.transform)
    .toContain('scale(1)');
  const editor = frame.getByRole('textbox');
  await editor.fill('A long composition edit');
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => edit.mock.calls.length).toBe(1);
  await expectText(surface, 'h1', 'A long composition edit');
});

it('preserves the camera when direct text editing is already readable at 100 and 200 percent', async () => {
  const edit = vi.fn().mockResolvedValue({ ok: true });
  await renderInApp(
    <Box style={{ width: 1100, height: 650 }}>
      <CanvasBoard
        frames={[{ ...frames[1], id: 'readable', x: 0, width: 390, height: 400 }]}
        renderFrame={(target, input) => (
          <Preview
            content={html.replace('margin:24px', 'margin:120px 24px 24px')}
            id={target.id}
            onEdit={edit}
            onInput={input}
          />
        )}
      />
    </Box>,
  );
  const { surface, frame } = await preview(
    document.querySelector('iframe[title="readable draft preview"]')!,
  );
  const world = page.getByTestId('canvas-world').element() as HTMLElement;
  const before = world.style.transform;
  expect(before).toContain('scale(1)');
  await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
  await expect
    .poll(async () => (await surface.measureLayout(new AbortController().signal)).localEdits.active)
    .toBe(true);
  expect(world.style.transform).toBe(before);
  await surface.cancelInlineTextEdit(new AbortController().signal);
  for (let index = 0; index < 4; index++) {
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  }
  const zoomed = world.style.transform;
  expect(zoomed).toContain('scale(2)');
  await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
  await expect
    .poll(async () => (await surface.measureLayout(new AbortController().signal)).localEdits.active)
    .toBe(true);
  expect(world.style.transform).toBe(zoomed);
});

it.each(['hide', 'replace-text'])(
  'retires delayed text admission when the target changes: %s',
  async (change) => {
    const inputs = vi.fn();
    const edit = vi.fn().mockResolvedValue({ ok: true });
    const content = `${html}<script>window.addEventListener('message', event => {
    const heading = document.querySelector('h1');
    if (event.data === 'hide') heading.style.display = 'none';
    if (event.data === 'replace-text') heading.firstChild.data = 'Changed before admission';
  });</script>`;
    await renderInApp(
      <Box style={{ width: 500, height: 400 }}>
        <Preview content={content} onEdit={edit} onInput={inputs} />
      </Box>,
    );
    const element = document.querySelector<HTMLIFrameElement>(
      'iframe[title="default draft preview"]',
    )!;
    const { surface, frame } = await preview(element);
    const signal = new AbortController().signal;
    const port = (surface as unknown as { commandPort: MessagePort }).commandPort;
    const postMessage = port.postMessage.bind(port);
    let admission: unknown;
    const held = vi.spyOn(port, 'postMessage').mockImplementation((message: unknown) => {
      if (
        message &&
        typeof message === 'object' &&
        'type' in message &&
        message.type === 'inline-text-admission-result'
      ) {
        admission = message;
      } else {
        postMessage(message);
      }
    });
    try {
      await frame.getByRole('heading', { name: 'Initial heading' }).dblClick();
      await expect.poll(() => Boolean(admission)).toBe(true);
      expect((await surface.measureLayout(signal)).localEdits.active).toBe(true);
      element.contentWindow!.postMessage(change, '*');
      await expect
        .poll(async () => {
          try {
            const result = await surface.inspectElement({ selector: 'h1' }, signal);
            return change === 'hide'
              ? result.box.width === 0
              : result.text === 'Changed before admission';
          } catch (error) {
            return (
              change === 'hide' &&
              error instanceof Error &&
              error.message === 'The matching preview element is hidden or inaccessible.'
            );
          }
        })
        .toBe(true);
      postMessage(admission);
      expect((await surface.measureLayout(signal)).localEdits.active).toBe(false);
      expect(inputs.mock.calls.at(-1)?.[0]).toMatchObject({ kind: 'inline-edit', box: null });
      expect(edit).not.toHaveBeenCalled();
    } finally {
      held.mockRestore();
    }
  },
);

it('selects unsupported images without opening a picker by pointer or keyboard', async () => {
  const edit = vi.fn().mockResolvedValue({ ok: true });
  const inputs = vi.fn();
  const content =
    '<img alt="Selectable image" width="100" height="100" data-edit="index.hbs:3:1" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"><p id="picker-state">No picker</p><script>window.addEventListener("click", event => {if(event.target.dataset.testid === "builder-inline-image-input") document.querySelector("#picker-state").textContent = "Picker opened";}, true);</script>';
  await renderInApp(
    <Box style={{ width: 500, height: 400 }}>
      <Preview content={content} inlineImageEditing={false} onEdit={edit} onInput={inputs} />
    </Box>,
  );
  const { surface, frame } = await preview(
    document.querySelector('iframe[title="default draft preview"]')!,
  );
  const selections = vi.fn();
  surface.onSelection(selections);
  await frame.getByRole('img', { name: 'Selectable image' }).dblClick();
  await expectText(surface, '#picker-state', 'No picker');
  await expectText(
    surface,
    '[data-builder-inline-notice]',
    'Inline image replacement is unavailable here. Select the image to edit its source.',
  );
  await frame.getByRole('img', { name: 'Selectable image' }).click();
  const beforeKeyboard = selections.mock.calls.length;
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => selections.mock.calls.length).toBeGreaterThan(beforeKeyboard);
  await expectText(surface, '#picker-state', 'No picker');
  expect(edit).not.toHaveBeenCalled();
});
