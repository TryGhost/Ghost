import { expect, it, vi } from 'vitest';

import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { CanvasProbe, registerCanvasProbe } from './webmcp-probe';
import type { ProbeTool } from './webmcp-probe';

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
