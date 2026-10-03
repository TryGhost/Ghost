import { describe, expect, it, vi } from 'vitest';

import { CanvasProbe, registerCanvasProbe } from './webmcp-probe';
import type { CanvasProbeSurface, ProbeTool } from './webmcp-probe';

const descriptor = {
  id: 'home-mobile',
  label: 'Home · Mobile',
  group: 'Home',
  width: 390,
  height: 844,
};
const document = { html: '<h1>Home</h1>', url: 'https://example.com/', revision: 'revision-1' };
const layout = {
  documentId: 'revision-1:1',
  documentInstanceId: 'revision-1:bridge-1',
  localEdits: { generation: 0, active: false, changed: false },
  viewport: { width: 390, height: 844, scrollX: 0, scrollY: 123 },
  document: { width: 390, height: 3000 },
};

function surface(): CanvasProbeSurface {
  return {
    measureLayout: vi.fn().mockResolvedValue(layout),
    inspectPage: vi.fn().mockResolvedValue({
      url: document.url,
      title: 'Home',
      viewport: layout.viewport,
      outline: [],
      text: 'Home',
      truncated: { outline: false, text: false, source: false },
    }),
    screenshot: vi.fn().mockResolvedValue({
      width: 390,
      height: 844,
      dataUrl: 'data:image/png;base64,AAAA',
      warnings: ['External imagery omitted'],
    }),
  };
}

function tool(probe: CanvasProbe, operation: string) {
  return probe.tools().find((item) => item.name.endsWith(operation))!;
}

function target(probe: CanvasProbe) {
  const state = probe.state();
  const frame = state.frames[0];
  return {
    workspaceId: state.workspaceId,
    frameHandle: frame.frameHandle,
    representationHandle: frame.device?.representationHandle,
    expectedRevision: document.revision,
    expectedRenderKey: frame.device?.renderKey,
  };
}

async function fixture() {
  const probe = new CanvasProbe([descriptor], 'https://example.com/');
  const preview = surface();
  const connection = probe.attach(descriptor.id, preview, document);
  await connection.ready();
  return { probe, preview, connection };
}

describe('addressed read-only canvas probe', () => {
  it('identifies the real editor workspace without claiming fixture or mutation support', () => {
    const probe = new CanvasProbe([descriptor], 'https://example.com/', {
      workspaceId: 'theme-canvas:active-workspace',
      fixture: false,
    });
    expect(probe.state()).toMatchObject({
      workspaceId: 'theme-canvas:active-workspace',
      fixture: false,
      protocolVersion: 'canvas-editor-probe-1',
      capabilities: { readOnly: true, mutations: false, publication: false },
    });
    probe.dispose();
  });

  it('invalidates same-source data reads immediately and retires handles even when refresh fails', async () => {
    const { probe, preview } = await fixture();
    const before = target(probe);
    const restore = probe.invalidateForRefresh();
    expect(await tool(probe, 'inspect_frame').execute(before)).toMatchObject({
      code: 'stale_render',
    });
    expect(preview.inspectPage).not.toHaveBeenCalled();
    restore();
    expect(target(probe).representationHandle).not.toBe(before.representationHandle);
    expect(await tool(probe, 'inspect_frame').execute(before)).toMatchObject({
      code: 'target_unavailable',
    });
    expect(await tool(probe, 'inspect_frame').execute(target(probe))).toMatchObject({
      status: 'ok',
    });
  });

  it('checks the data render key independently of unchanged source revision', async () => {
    const { probe, preview } = await fixture();
    const current = target(probe);
    expect(
      await tool(probe, 'inspect_frame').execute({
        ...current,
        expectedRenderKey: 'obsolete-data',
      }),
    ).toMatchObject({ code: 'render_conflict' });
    expect(preview.inspectPage).not.toHaveBeenCalled();
  });

  it('does not turn a failed surface into a current surface after rejected refresh', async () => {
    const { probe, connection } = await fixture();
    connection.fail();
    const restore = probe.invalidateForRefresh();
    restore();
    expect(probe.state().frames[0].device?.status).toBe('failed');
  });

  it('does not let older refresh recovery recertify a newer observed refresh', async () => {
    const { probe } = await fixture();
    const older = probe.invalidateForRefresh();
    probe.invalidateForRefresh();
    older();
    expect(probe.state().frames[0].device?.status).toBe('stale');
  });

  it('rejects a read in flight when a data refresh is observed', async () => {
    const { probe, preview } = await fixture();
    vi.mocked(preview.inspectPage).mockImplementation(() => new Promise(() => {}));
    const reading = tool(probe, 'inspect_frame').execute(target(probe));
    await vi.waitFor(() => expect(preview.inspectPage).toHaveBeenCalled());
    probe.invalidateForRefresh();
    expect(await reading).toMatchObject({ code: 'target_unavailable' });
    probe.dispose();
  });

  it.each([
    { generation: 1, active: true, changed: false },
    { generation: 2, active: false, changed: true },
  ])('refuses local edits before reading pixels or page text: %j', async (localEdits) => {
    const { probe, preview } = await fixture();
    vi.mocked(preview.measureLayout).mockResolvedValue({ ...layout, localEdits });
    expect(await tool(probe, 'inspect_frame').execute(target(probe))).toMatchObject({
      status: 'error',
      code: 'local_edits_present',
    });
    expect(
      await tool(probe, 'capture_frame').execute({ ...target(probe), kind: 'viewport' }),
    ).toMatchObject({ status: 'error', code: 'local_edits_present' });
    expect(preview.inspectPage).not.toHaveBeenCalled();
    expect(preview.screenshot).not.toHaveBeenCalled();
  });

  it('rejects local editing that starts and cancels while inspection is in flight', async () => {
    const { probe, preview } = await fixture();
    const inspect = vi.mocked(preview.inspectPage).getMockImplementation()!;
    vi.mocked(preview.inspectPage).mockImplementationOnce((url, signal) => {
      vi.mocked(preview.measureLayout).mockResolvedValue({
        ...layout,
        localEdits: { generation: 2, active: false, changed: false },
      });
      return inspect(url, signal);
    });
    expect(await tool(probe, 'inspect_frame').execute(target(probe))).toMatchObject({
      code: 'stale_document',
    });
  });

  it('rejects a restored document instance without silently substituting its old handle', async () => {
    const { probe, preview } = await fixture();
    vi.mocked(preview.measureLayout).mockResolvedValue({
      ...layout,
      documentInstanceId: 'restored',
    });
    expect(await tool(probe, 'inspect_frame').execute(target(probe))).toMatchObject({
      code: 'stale_document',
    });
  });
  it('reads a discovered device target without selecting it or moving the camera', async () => {
    const { probe } = await fixture();
    const before = probe.state().view;
    const result = await tool(probe, 'inspect_frame').execute(target(probe));
    expect(result.status).toBe('ok');
    expect(result).toMatchObject({
      data: {
        frameId: descriptor.id,
        revision: document.revision,
        documentId: layout.documentId,
        representation: 'device',
        viewport: layout.viewport,
      },
    });
    expect(probe.state().view).toEqual(before);
  });

  it('rejects wrong workspaces, revisions, unknown arguments, and obsolete surface handles before reading', async () => {
    const { probe, preview, connection } = await fixture();
    const original = target(probe);
    const inspect = tool(probe, 'inspect_frame');
    expect(await inspect.execute({ ...original, workspaceId: 'other-workspace' })).toMatchObject({
      code: 'workspace_mismatch',
    });
    expect(await inspect.execute({ ...original, expectedRevision: 'old' })).toMatchObject({
      code: 'revision_conflict',
    });
    expect(await inspect.execute({ ...original, navigate: '/' })).toMatchObject({
      code: 'invalid_arguments',
    });
    connection.dispose();
    await probe.attach(descriptor.id, surface(), document).ready();
    expect(await inspect.execute(original)).toMatchObject({ code: 'target_unavailable' });
    expect(preview.inspectPage).not.toHaveBeenCalled();
  });

  it('rejects a document replacement that happens during otherwise successful inspection', async () => {
    const { probe, preview } = await fixture();
    vi.mocked(preview.inspectPage).mockImplementationOnce(() => {
      vi.mocked(preview.measureLayout).mockResolvedValue({ ...layout, documentId: 'replacement' });
      return Promise.resolve({
        url: document.url,
        title: 'Home',
        viewport: layout.viewport,
        outline: [],
        text: 'Home',
        truncated: { outline: false, text: false, source: false },
      });
    });
    expect(await tool(probe, 'inspect_frame').execute(target(probe))).toMatchObject({
      code: 'stale_document',
    });
  });

  it('captures actual device-resolution pixels with lineage, coverage and fidelity warnings', async () => {
    const { probe, preview } = await fixture();
    const result = await tool(probe, 'capture_frame').execute({
      ...target(probe),
      kind: 'viewport',
    });
    expect(result).toMatchObject({
      status: 'ok',
      data: {
        frameId: descriptor.id,
        documentId: layout.documentId,
        coverage: { x: 0, y: 123, width: 390, height: 844 },
        image: { mimeType: 'image/png', width: 390, height: 844 },
        warnings: ['External imagery omitted'],
        nativeImageConsumption: 'unverified',
      },
    });
    expect(preview.screenshot).toHaveBeenCalledWith({ kind: 'viewport' }, expect.any(AbortSignal));
  });

  it('validates output bounds before capture and serializes concurrent requests', async () => {
    const { probe, preview } = await fixture();
    const capture = tool(probe, 'capture_frame');
    expect(
      await capture.execute({
        ...target(probe),
        kind: 'region',
        x: 0,
        y: 0,
        width: 390,
        height: 100_000,
      }),
    ).toMatchObject({ code: 'invalid_arguments' });
    expect(preview.screenshot).not.toHaveBeenCalled();
    let release!: (value: Awaited<ReturnType<CanvasProbeSurface['screenshot']>>) => void;
    vi.mocked(preview.screenshot).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const first = capture.execute({ ...target(probe), kind: 'viewport' });
    await vi.waitFor(() => expect(preview.screenshot).toHaveBeenCalledOnce());
    expect(await capture.execute({ ...target(probe), kind: 'viewport' })).toMatchObject({
      code: 'busy',
    });
    release({ width: 390, height: 844, dataUrl: 'data:image/png;base64,AAAA', warnings: [] });
    expect(await first).toMatchObject({ status: 'ok' });
  });

  it('answers cancellation promptly and rejects late work from a surface that ignores abort', async () => {
    const { probe, preview } = await fixture();
    let release!: (value: Awaited<ReturnType<CanvasProbeSurface['screenshot']>>) => void;
    vi.mocked(preview.screenshot).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const controller = new AbortController();
    const pending = tool(probe, 'capture_frame').execute(
      { ...target(probe), kind: 'viewport' },
      { signal: controller.signal },
    );
    await vi.waitFor(() => expect(preview.screenshot).toHaveBeenCalledOnce());
    controller.abort();
    expect(await pending).toMatchObject({ code: 'cancelled' });
    release({ width: 390, height: 844, dataUrl: 'data:image/png;base64,AAAA', warnings: [] });
    await Promise.resolve();
    expect(probe.state().view.selectedFrameId).toBeNull();
  });

  it('promptly reports an unavailable target if the addressed surface detaches mid-capture', async () => {
    const { probe, preview, connection } = await fixture();
    let release!: (value: Awaited<ReturnType<CanvasProbeSurface['screenshot']>>) => void;
    vi.mocked(preview.screenshot).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = tool(probe, 'capture_frame').execute({ ...target(probe), kind: 'viewport' });
    await vi.waitFor(() => expect(preview.screenshot).toHaveBeenCalledOnce());
    connection.dispose();
    try {
      const response = await Promise.race([
        pending,
        new Promise((resolve) => {
          setTimeout(() => resolve({ code: 'observation_timeout' }), 100);
        }),
      ]);
      expect(response).toMatchObject({ code: 'target_unavailable' });
    } finally {
      release({ width: 390, height: 844, dataUrl: 'data:image/png;base64,AAAA', warnings: [] });
      await pending;
    }
  });
});

describe('top-level WebMCP registration', () => {
  it('reports a failing browser API without rejecting setup or breaking the manual harness', async () => {
    const probe = new CanvasProbe([descriptor], 'https://example.com/');
    Object.defineProperty(window.document, 'modelContext', {
      configurable: true,
      get: () => {
        throw new Error('Browser policy unavailable');
      },
    });
    const registration = registerCanvasProbe(window.document, probe);
    try {
      expect(await registration.ready).toBe('failed');
    } finally {
      registration.dispose();
      Reflect.deleteProperty(window.document, 'modelContext');
    }
  });
  it('keeps unsupported browsers usable without adding a navigator polyfill', async () => {
    const probe = new CanvasProbe([descriptor], 'https://example.com/');
    const registration = registerCanvasProbe(window.document, probe);
    expect(await registration.ready).toBe('unsupported');
    expect(navigator).not.toHaveProperty('modelContext');
    registration.dispose();
  });

  it('owns three registrations once, aborts their lifetime, and rejects an obsolete callback', async () => {
    const { probe } = await fixture();
    const registered: ProbeTool[] = [];
    const signals: AbortSignal[] = [];
    const registerTool = vi.fn((definition: ProbeTool, options: { signal: AbortSignal }) => {
      registered.push(definition);
      signals.push(options.signal);
      return Promise.resolve();
    });
    Object.defineProperty(window.document, 'modelContext', {
      configurable: true,
      value: { registerTool },
    });
    try {
      const registration = registerCanvasProbe(window.document, probe);
      expect(await registration.ready).toBe('registered');
      expect(registerTool).toHaveBeenCalledTimes(3);
      probe.setView(
        {
          camera: { x: 10, y: 20, scale: 0.2 },
          selectedFrameId: descriptor.id,
        },
        'expanded',
      );
      expect(registerTool).toHaveBeenCalledTimes(3);
      registration.dispose();
      expect(signals.every((signal) => signal.aborted)).toBe(true);
      expect(await registered[0].execute({})).toMatchObject({ code: 'workspace_unavailable' });
    } finally {
      Reflect.deleteProperty(window.document, 'modelContext');
    }
  });

  it('aborts partial registrations when a later tool cannot register', async () => {
    const probe = new CanvasProbe([descriptor], 'https://example.com/');
    const signals: AbortSignal[] = [];
    let calls = 0;
    const registerTool = vi.fn((_definition: ProbeTool, options: { signal: AbortSignal }) => {
      signals.push(options.signal);
      calls += 1;
      return calls === 2 ? Promise.reject(new Error('Duplicate tool')) : Promise.resolve();
    });
    Object.defineProperty(window.document, 'modelContext', {
      configurable: true,
      value: { registerTool },
    });
    try {
      const registration = registerCanvasProbe(window.document, probe);
      expect(await registration.ready).toBe('failed');
      expect(signals.every((signal) => signal.aborted)).toBe(true);
      registration.dispose();
    } finally {
      Reflect.deleteProperty(window.document, 'modelContext');
    }
  });
});
