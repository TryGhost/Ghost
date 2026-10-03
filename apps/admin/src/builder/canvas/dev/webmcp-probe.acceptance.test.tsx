import { expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { CanvasProbe, registerCanvasProbe } from './webmcp-probe';
import type { ProbeTool } from './webmcp-probe';

const createEditablePreview = async () => {
  const descriptor = {
    id: 'home-mobile',
    label: 'Home · Mobile',
    group: 'Home',
    width: 390,
    height: 844,
  };
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:390px;height:844px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation: true });
  const signal = new AbortController().signal;
  const preview = {
    html: '<style>body{margin:0;min-height:1800px}h1{margin:160px 20px 0}</style><h1 data-edit="index.hbs:1:1">Accepted heading</h1><script>window.scrollTo(0,123)</script>',
    url: 'https://example.com/',
    revision: 'read-race-1',
  };
  await surface.setInlineEditMode(true, signal);
  await surface.replaceDocument(preview, null, signal);
  const probe = new CanvasProbe([descriptor], preview.url);
  const connection = probe.attach(descriptor.id, surface, preview);
  await connection.ready();
  return {
    surface,
    signal,
    preview,
    probe,
    frame: page.frameLocator(page.elementLocator(iframe)),
    target: () => {
      const state = probe.state();
      const frame = state.frames[0];
      return {
        workspaceId: state.workspaceId,
        frameHandle: frame.frameHandle,
        representationHandle: frame.device!.representationHandle,
        expectedRevision: frame.device!.revision,
      };
    },
    dispose: () => {
      connection.dispose();
      probe.dispose();
      surface.destroy();
      iframe.remove();
    },
  };
};

it('keeps an old inline callback out of a restored runtime with reused document and edit IDs', async () => {
  const fixture = await createEditablePreview();
  const { surface, signal, preview, frame, probe, target } = fixture;
  let finishOld!: (result: { ok: true }) => void;
  let oldSignal!: AbortSignal;
  const callback = vi.fn((_edit, callbackSignal: AbortSignal) => {
    oldSignal = callbackSignal;
    return new Promise<{ ok: true }>((resolve) => {
      finishOld = resolve;
    });
  });
  surface.onInlineEdit(callback);
  try {
    // Isolate restoration from the separate rapid-consecutive-load guard issue.
    await new Promise((resolve) => {
      setTimeout(resolve, 150);
    });
    const before = await surface.measureLayout(signal);
    await frame.getByRole('heading').click();
    await frame.getByRole('textbox').fill('Old submitted text');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => callback.mock.calls.length).toBe(1);
    const replacement = new AbortController();
    const pending = surface.replaceDocument(
      { ...preview, revision: 'read-race-2' },
      null,
      replacement.signal,
    );
    replacement.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect
      .poll(async () => {
        try {
          return (await surface.measureLayout(signal)).documentInstanceId;
        } catch {
          return before.documentInstanceId;
        }
      })
      .not.toBe(before.documentInstanceId);
    const restored = await surface.measureLayout(signal);
    expect(restored.documentId).toBe(before.documentId);
    expect(await probe.tools()[1].execute(target())).toMatchObject({
      status: 'error',
      code: 'stale_document',
    });
    await frame.getByRole('heading').click();
    await frame.getByRole('textbox').fill('New unsubmitted draft');
    finishOld({ ok: true });
    // Wait for the callback continuation and any bridge delivery, then inspect raw DOM.
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    expect((await surface.inspectElement({ selector: '[role="textbox"]' }, signal)).text).toBe(
      'New unsubmitted draft',
    );
    expect(oldSignal.aborted).toBe(true);
    expect((await surface.measureLayout(signal)).localEdits).toMatchObject({
      active: true,
      changed: false,
    });
  } finally {
    fixture.dispose();
  }
});

it.each(['inspect', 'capture'] as const)(
  'refuses certified %s while a rejected draft notice remains after cancellation',
  async (operation) => {
    const fixture = await createEditablePreview();
    const { surface, signal, frame, probe, target } = fixture;
    surface.onInlineEdit((edit) =>
      Promise.resolve({
        ok: false,
        message: `Rejected local draft: ${edit.kind === 'text' ? edit.newText : 'image'}`,
      }),
    );
    try {
      await frame.getByRole('heading').click();
      await frame.getByRole('textbox').fill('Uncommitted secret');
      await userEvent.keyboard('{Enter}');
      await expect
        .poll(
          async () => (await surface.inspectElement({ selector: '[role="alert"]' }, signal)).text,
        )
        .toContain('Uncommitted secret');
      await userEvent.keyboard('{Escape}');
      await expect
        .poll(async () => (await surface.inspectElement({ selector: 'h1' }, signal)).text)
        .toBe('Accepted heading');
      const tool = probe.tools()[operation === 'inspect' ? 1 : 2];
      expect(
        await tool.execute({
          ...target(),
          ...(operation === 'capture' ? { kind: 'viewport' } : {}),
        }),
      ).toMatchObject({ status: 'error', code: 'local_edits_present' });
      await expect
        .poll(async () => (await surface.measureLayout(signal)).localEdits.changed, {
          timeout: 5_000,
        })
        .toBe(false);
      expect(await probe.tools()[1].execute(target())).toMatchObject({
        status: 'ok',
        data: { page: { text: 'Accepted heading' } },
      });
    } finally {
      fixture.dispose();
    }
  },
);

it.each(['inspect', 'capture'] as const)(
  'rejects certified %s when a real draft begins and cancels during the read',
  async (operation) => {
    const fixture = await createEditablePreview();
    const { surface, signal, frame, probe, target } = fixture;
    try {
      const before = await surface.measureLayout(signal);
      const injectDraft = async () => {
        await frame.getByRole('heading').click();
        await frame.getByRole('textbox').fill('In-flight draft');
      };
      if (operation === 'inspect') {
        const inspect = surface.inspectPage.bind(surface);
        vi.spyOn(surface, 'inspectPage').mockImplementationOnce(async (...args) => {
          await injectDraft();
          const result = await inspect(...args);
          expect(result.text).toContain('In-flight draft');
          await userEvent.keyboard('{Escape}');
          return result;
        });
      } else {
        const screenshot = surface.screenshot.bind(surface);
        vi.spyOn(surface, 'screenshot').mockImplementationOnce(async (...args) => {
          await injectDraft();
          const result = await screenshot(...args);
          await userEvent.keyboard('{Escape}');
          return result;
        });
      }
      expect(
        await probe.tools()[operation === 'inspect' ? 1 : 2].execute({
          ...target(),
          ...(operation === 'capture' ? { kind: 'viewport' } : {}),
        }),
      ).toMatchObject({ status: 'error', code: 'stale_document' });
      expect((await surface.measureLayout(signal)).viewport).toEqual(before.viewport);
      expect((await surface.inspectElement({ selector: 'h1' }, signal)).text).toBe(
        'Accepted heading',
      );
    } finally {
      vi.restoreAllMocks();
      fixture.dispose();
    }
  },
);

it.each(['inspect', 'capture'] as const)(
  'refuses revision-certified reads of a manual draft without losing it or moving the user view (%s)',
  async (operation) => {
    const descriptor = {
      id: 'home-mobile',
      label: 'Home · Mobile',
      group: 'Home',
      width: 390,
      height: 844,
    };
    const probe = new CanvasProbe([descriptor], 'https://example.com/');
    const iframe = document.createElement('iframe');
    iframe.title = 'Draft provenance preview';
    iframe.style.cssText = 'width:390px;height:844px;border:0';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation: true });
    const edit = vi.fn().mockResolvedValue({ ok: true });
    surface.onInlineEdit(edit);
    const signal = new AbortController().signal;
    const preview = {
      html: '<style>body{margin:0;min-height:1800px}h1{margin:160px 20px 0}</style><h1 data-edit="index.hbs:1:1">Accepted heading</h1><script>window.scrollTo(0,123)</script>',
      url: 'https://example.com/',
      revision: 'draft-evidence-1',
    };
    const frame = page.frameLocator(page.elementLocator(iframe));
    let connection: ReturnType<CanvasProbe['attach']> | undefined;
    const readText = async (selector: string) =>
      (await surface.inspectElement({ selector }, signal)).text;
    try {
      await surface.setInlineEditMode(true, signal);
      await surface.replaceDocument(preview, null, signal);
      connection = probe.attach(descriptor.id, surface, preview);
      await connection.ready();
      probe.setView(
        {
          camera: { x: 20, y: 30, scale: 0.2 },
          selectedFrameId: descriptor.id,
          openedFrameId: descriptor.id,
        },
        'device',
      );
      const view = probe.state().view;
      const layout = await surface.measureLayout(signal);
      const target = () => {
        const state = probe.state();
        const device = state.frames[0].device!;
        return {
          workspaceId: state.workspaceId,
          frameHandle: state.frames[0].frameHandle,
          representationHandle: device.representationHandle,
          expectedRevision: device.revision,
        };
      };
      const tools = probe.tools();
      expect(await tools[1].execute(target())).toMatchObject({
        status: 'ok',
        data: { page: { text: 'Accepted heading' } },
      });
      await frame.getByRole('heading', { name: 'Accepted heading' }).click();
      await frame.getByRole('textbox').fill('Only in my manual draft');
      for (const [tool, args] of (operation === 'inspect'
        ? [[tools[1], target()]]
        : [[tools[2], { ...target(), kind: 'viewport' }]]) as readonly (readonly [
        ProbeTool,
        Record<string, unknown>,
      ])[]) {
        expect(await tool.execute(args)).toMatchObject({
          status: 'error',
          code: 'local_edits_present',
        });
        await expect.poll(() => readText('[role="textbox"]')).toBe('Only in my manual draft');
      }
      expect(probe.state().view).toEqual(view);
      expect((await surface.measureLayout(signal)).viewport).toEqual(layout.viewport);
      expect(edit).not.toHaveBeenCalled();
      await frame.getByRole('textbox').click();
      await userEvent.keyboard('{Escape}');
      expect(await tools[1].execute(target())).toMatchObject({
        status: 'ok',
        data: { page: { text: 'Accepted heading' } },
      });
      await frame.getByRole('heading', { name: 'Accepted heading' }).click();
      await frame.getByRole('textbox').fill('Accepted by the callback');
      await userEvent.keyboard('{Enter}');
      await expect.poll(() => edit.mock.calls.length).toBe(1);
      await expect.poll(() => readText('h1')).toBe('Accepted by the callback');
      // A successful callback alone cannot relabel modified DOM as the old render.
      expect(await tools[1].execute(target())).toMatchObject({
        status: 'error',
        code: 'local_edits_present',
      });
      connection.dispose();
      const refreshed = {
        ...preview,
        html: preview.html.replace('Accepted heading', 'Accepted by the callback'),
        revision: 'draft-evidence-2',
      };
      await surface.replaceDocument(refreshed, null, signal);
      connection = probe.attach(descriptor.id, surface, refreshed);
      await connection.ready();
      expect(await tools[1].execute(target())).toMatchObject({
        status: 'ok',
        data: { revision: 'draft-evidence-2', page: { text: 'Accepted by the callback' } },
      });
      expect(await tools[2].execute({ ...target(), kind: 'viewport' })).toMatchObject({
        status: 'ok',
        data: { revision: 'draft-evidence-2' },
      });
    } finally {
      connection?.dispose();
      probe.dispose();
      surface.destroy();
      iframe.remove();
    }
  },
);

it('inspects and captures a nonfocused opaque device at its real resolution without changing view or scroll', async () => {
  const descriptors = [
    { id: 'home-mobile', label: 'Home · Mobile', group: 'Home', width: 390, height: 844 },
    { id: 'post-desktop', label: 'Post · Desktop', group: 'Post', width: 1440, height: 900 },
  ];
  const probe = new CanvasProbe(descriptors, 'https://example.com/');
  const signal = new AbortController().signal;
  const surfaces: IframePreviewDocumentSurface[] = [];
  const iframes: HTMLIFrameElement[] = [];
  try {
    for (const descriptor of descriptors) {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `width:${descriptor.width}px;height:${descriptor.height}px;border:0`;
      document.body.appendChild(iframe);
      iframes.push(iframe);
      const surface = new IframePreviewDocumentSurface(iframe);
      surfaces.push(surface);
      const preview = {
        html: `<style>body{margin:0;background:rgb(0,255,0);height:3000px}</style><h1>${descriptor.group}</h1><script>window.scrollTo(0,123)</script>`,
        revision: 'fixture-1',
        url: `https://example.com/${descriptor.group.toLowerCase()}/`,
      };
      await surface.replaceDocument(preview, null, signal);
      await probe.attach(descriptor.id, surface, preview).ready();
    }
    const tools = probe.tools();
    const mobile = probe.state().frames[0];
    const args = {
      workspaceId: probe.workspaceId,
      frameHandle: mobile.frameHandle,
      representationHandle: mobile.device!.representationHandle,
      expectedRevision: 'fixture-1',
    };
    probe.setView(
      {
        camera: { x: 10, y: 20, scale: 0.2 },
        selectedFrameId: 'post-desktop',
        openedFrameId: 'post-desktop',
      },
      'expanded',
    );
    const view = probe.state().view;
    const before = await surfaces[0].measureLayout(signal);
    const inspection = await tools[1].execute(args);
    expect(inspection).toMatchObject({
      status: 'ok',
      data: {
        frameId: 'home-mobile',
        viewport: { width: 390, height: 844, scrollY: 123 },
        page: { title: '', text: 'Home' },
      },
    });
    const capture = await tools[2].execute({ ...args, kind: 'viewport' });
    expect(capture.status).toBe('ok');
    if (capture.status !== 'ok') {
      throw new Error(capture.message);
    }
    const encoded = capture.data.image as { width: number; height: number; dataUrl: string };
    expect(encoded).toMatchObject({ width: 390, height: 844 });
    const image = new Image();
    image.src = encoded.dataUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    expect([...context.getImageData(180, 100, 1, 1).data]).toEqual([0, 255, 0, 255]);
    expect(probe.state().view).toEqual(view);
    expect(await surfaces[0].measureLayout(signal)).toEqual(before);
    expect(iframes.every((iframe) => iframe.getAttribute('sandbox') === 'allow-scripts')).toBe(
      true,
    );
    expect(document.querySelector('iframe[sandbox="allow-same-origin"]')).toBeNull();
  } finally {
    probe.dispose();
    surfaces.forEach((surface) => surface.destroy());
    iframes.forEach((iframe) => iframe.remove());
  }
});

it('registers only in the top-level owning document and aborts all owned registrations', async () => {
  // Vitest runs browser tests in an iframe; its document is not the owning page.
  const owner = window.top!.document;
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const descriptor = {
    id: 'home-mobile',
    label: 'Home · Mobile',
    group: 'Home',
    width: 390,
    height: 844,
  };
  const childProbe = new CanvasProbe([descriptor], 'https://example.com/');
  const parentProbe = new CanvasProbe([descriptor], 'https://example.com/');
  const childRegister = vi.fn();
  const signals: AbortSignal[] = [];
  const definitions: ProbeTool[] = [];
  Object.defineProperty(iframe.contentDocument!, 'modelContext', {
    configurable: true,
    value: { registerTool: childRegister },
  });
  Object.defineProperty(owner, 'modelContext', {
    configurable: true,
    value: {
      registerTool: (tool: ProbeTool, options: { signal: AbortSignal }) => {
        definitions.push(tool);
        signals.push(options.signal);
        return Promise.resolve();
      },
    },
  });
  const child = registerCanvasProbe(iframe.contentDocument!, childProbe);
  const parent = registerCanvasProbe(owner, parentProbe);
  try {
    expect(await child.ready).toBe('unsupported');
    expect(childRegister).not.toHaveBeenCalled();
    expect(await parent.ready).toBe('registered');
    expect(definitions).toHaveLength(3);
    parent.dispose();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(await definitions[0].execute({})).toMatchObject({ code: 'workspace_unavailable' });
  } finally {
    child.dispose();
    parent.dispose();
    Reflect.deleteProperty(owner, 'modelContext');
    iframe.remove();
  }
});
