import { StrictMode } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasAgentConnection } from './canvas-agent-connection';
import type { CanvasProbe } from './canvas-probe';

const mocks = vi.hoisted(() => ({
  fetchApi:
    vi.fn<
      (
        path: string,
        options?: Record<string, unknown>,
      ) => Promise<{ canvasRelay: Record<string, unknown> | null }>
    >(),
  connect: vi.fn<typeof import('@tryghost/canvas-relay/client').connectRelayEditor>(),
}));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({ useFetchApi: () => mocks.fetchApi }));
vi.mock('@tryghost/admin-x-framework/helpers', () => ({
  apiUrl: (path: string) => '/ghost/api/admin' + path,
}));
vi.mock('@tryghost/canvas-relay/client', async (original) => ({
  ...(await original<typeof import('@tryghost/canvas-relay/client')>()),
  connectRelayEditor: mocks.connect,
}));
const session = '4940cd02-e9fd-4000-8000-432e84c088a5';
const connection = {
  serviceUrl: 'https://relay.example',
  tenant: 'alpha',
  session,
  token: 'editor-token',
};
const config = { url: connection.serviceUrl, tenant: connection.tenant };
const siteTools = vi.fn<CanvasProbe['siteTools']>(() => []);
const probe = { siteTools } as unknown as CanvasProbe;
beforeEach(() => {
  mocks.fetchApi.mockImplementation((path: string) =>
    Promise.resolve({ canvasRelay: path.endsWith('/pair/') ? connection : config }),
  );
  mocks.connect.mockResolvedValue({ close: vi.fn() });
  window.history.replaceState(null, '', '/ghost/');
});
afterEach(() => {
  vi.restoreAllMocks();
  mocks.fetchApi.mockReset();
  mocks.connect.mockReset();
  siteTools.mockClear();
});
const pairingLink = () =>
  window.location.origin +
  `/ghost/#/builder/theme?canvasPairSession=${session}&canvasPairCode=1234ABCD`;
describe('CLI-link canvas agent connection', () => {
  it('does nothing on an older backend even with a pairing URL', async () => {
    mocks.fetchApi.mockRejectedValue(new Error('404'));
    window.history.replaceState(null, '', pairingLink());
    const view = render(<CanvasAgentConnection probe={probe} />);
    await waitFor(() => expect(mocks.fetchApi).toHaveBeenCalledOnce());
    expect(view.container).toBeEmptyDOMElement();
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(window.location.href).toBe(pairingLink());
  });
  it('renders no controls and never pairs without a CLI link', async () => {
    const view = render(<CanvasAgentConnection probe={probe} />);
    await waitFor(() => expect(mocks.fetchApi).toHaveBeenCalledOnce());
    expect(view.container).toBeEmptyDOMElement();
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it('connects once without dialogs and retains the pairing URL for reload', async () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    window.history.replaceState(null, '', pairingLink() + '&proof=keep');
    const view = render(
      <StrictMode>
        <CanvasAgentConnection probe={probe} />
      </StrictMode>,
    );
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledOnce());
    expect(mocks.fetchApi.mock.calls.filter(([path]) => path.endsWith('/pair/'))).toHaveLength(1);
    expect(mocks.fetchApi).toHaveBeenCalledWith(
      '/ghost/api/admin/canvas-relay/pair/',
      expect.objectContaining({
        method: 'POST',
        retry: false,
        body: JSON.stringify({ canvasRelay: [{ session, code: '1234ABCD' }] }),
      }),
    );
    expect(mocks.connect.mock.calls[0][0]).toEqual(connection);
    expect(siteTools).toHaveBeenCalledOnce();
    expect(window.location.href).toBe(pairingLink() + '&proof=keep');
    expect(view.container).toBeEmptyDOMElement();
    expect(prompt).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    view.rerender(
      <StrictMode>
        <CanvasAgentConnection probe={probe} />
      </StrictMode>,
    );
    expect(mocks.connect).toHaveBeenCalledOnce();
    const signal = mocks.connect.mock.calls[0][2].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
  it('connects on hash navigation without remounting the editor', async () => {
    render(<CanvasAgentConnection probe={probe} />);
    await waitFor(() => expect(mocks.fetchApi).toHaveBeenCalledOnce());
    window.history.replaceState(null, '', pairingLink());
    fireEvent(window, new HashChangeEvent('hashchange'));
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledOnce());
  });
  it('reports expired links through diagnostics without retrying approval', async () => {
    const diagnostics = vi.spyOn(console, 'error').mockImplementation(() => {});
    const expired = new Error('Pairing expired; request a new link.');
    mocks.fetchApi.mockImplementation((path: string) =>
      path.endsWith('/pair/') ? Promise.reject(expired) : Promise.resolve({ canvasRelay: config }),
    );
    window.history.replaceState(null, '', pairingLink());
    render(<CanvasAgentConnection probe={probe} />);
    await waitFor(() =>
      expect(diagnostics).toHaveBeenCalledWith('Canvas agent connection failed:', expired),
    );
    expect(window.location.href).toBe(pairingLink());
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(mocks.fetchApi.mock.calls.filter(([path]) => path.endsWith('/pair/'))).toHaveLength(1);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it('does not attach a connection for another session or service', async () => {
    const diagnostics = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.fetchApi.mockImplementation((path: string) =>
      Promise.resolve({
        canvasRelay: path.endsWith('/pair/') ? { ...connection, tenant: 'other' } : config,
      }),
    );
    window.history.replaceState(null, '', pairingLink());
    render(<CanvasAgentConnection probe={probe} />);
    await waitFor(() =>
      expect(diagnostics).toHaveBeenCalledWith(
        'Canvas agent connection failed:',
        expect.objectContaining({ message: 'Ghost returned a different connection.' }),
      ),
    );
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it('reuses authorization after an effect refresh without consuming the pairing code again', async () => {
    window.history.replaceState(null, '', pairingLink());
    const view = render(<CanvasAgentConnection probe={probe} />);
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledOnce());
    const initialSignal = mocks.connect.mock.calls[0][2].signal;
    const refreshedProbe = { siteTools: vi.fn(() => []) } as unknown as CanvasProbe;
    view.rerender(<CanvasAgentConnection probe={refreshedProbe} />);
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(2));
    expect(initialSignal.aborted).toBe(true);
    expect(mocks.connect.mock.calls[1][0]).toEqual(connection);
    expect(mocks.fetchApi.mock.calls.filter(([path]) => path.endsWith('/pair/'))).toHaveLength(1);
    view.unmount();
    expect(mocks.connect.mock.calls[1][2].signal.aborted).toBe(true);
  });
  it('never consumes a code if the editor closes during discovery', async () => {
    let discovered!: (result: { canvasRelay: typeof config }) => void;
    mocks.fetchApi.mockReturnValue(
      new Promise((resolve) => {
        discovered = resolve;
      }),
    );
    window.history.replaceState(null, '', pairingLink());
    const view = render(<CanvasAgentConnection probe={probe} />);
    view.unmount();
    discovered({ canvasRelay: config });
    await Promise.resolve();
    expect(mocks.fetchApi).toHaveBeenCalledOnce();
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(window.location.href).toBe(pairingLink());
  });
  it('resumes the same URL session on a fresh editor mount without local storage', async () => {
    const local = vi.spyOn(Storage.prototype, 'setItem');
    window.history.replaceState(null, '', pairingLink());
    const first = render(<CanvasAgentConnection probe={probe} />);
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledOnce());
    const signal = mocks.connect.mock.calls[0][2].signal;
    first.unmount();
    expect(signal.aborted).toBe(true);
    render(<CanvasAgentConnection probe={probe} />);
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(2));
    expect(mocks.connect.mock.calls[1][0]).toEqual(connection);
    expect(window.location.href).toBe(pairingLink());
    expect(local).not.toHaveBeenCalled();
  });
});
