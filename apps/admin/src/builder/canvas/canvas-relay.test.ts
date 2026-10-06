import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readCanvasRelayInvitation, startCanvasRelay } from './canvas-relay';
import type { CanvasProbe } from './canvas-probe';

const connect = vi.hoisted(() =>
  vi.fn<typeof import('@tryghost/canvas-relay/client').connectRelayEditor>(),
);
vi.mock('@tryghost/canvas-relay/client', async (original) => ({
  ...(await original<typeof import('@tryghost/canvas-relay/client')>()),
  connectRelayEditor: connect,
}));
const session = '4940cd02-e9fd-4000-8000-432e84c088a5';
const invitation = `#/builder/theme?canvasRelayTenant=dev-site&canvasRelaySession=${session}&canvasRelayToken=private-token`;
const service = 'https://relay.example.com';
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  connect.mockReset();
  window.history.replaceState(null, '', '/');
});
describe('contextual development relay connection', () => {
  it('pins the configured relay and ignores sign-in, partial or malformed invitations', () => {
    expect(readCanvasRelayInvitation(invitation, service)).toEqual({
      serviceUrl: service,
      tenant: 'dev-site',
      session,
      token: 'private-token',
    });
    expect(
      readCanvasRelayInvitation(invitation.replace('builder/theme', 'signin'), service),
    ).toBeNull();
    expect(
      readCanvasRelayInvitation('#/builder/theme?canvasRelayToken=private-token', service),
    ).toBeNull();
    expect(readCanvasRelayInvitation(invitation.replace(session, 'other'), service)).toBeNull();
    expect(() => readCanvasRelayInvitation(invitation, 'http://untrusted.example')).toThrow();
  });
  it('does not prompt or connect without an invitation', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    startCanvasRelay(window, {} as CanvasProbe, service)();
    vi.runAllTimers();
    expect(confirm).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });
  it('removes credentials before contextual approval and respects refusal', () => {
    window.history.replaceState(null, '', '/' + invitation + '&keep=value');
    const confirm = vi.spyOn(window, 'confirm').mockImplementation(() => {
      expect(window.location.hash).toBe('#/builder/theme?keep=value');
      return false;
    });
    const close = startCanvasRelay(window, {} as CanvasProbe, service);
    vi.runAllTimers();
    close();
    expect(confirm).toHaveBeenCalledOnce();
    expect(connect).not.toHaveBeenCalled();
  });
  it('uses application actions and aborts on departure without replay or registration', () => {
    window.history.replaceState(null, '', '/' + invitation);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    connect.mockResolvedValue({ close: vi.fn() });
    const tools = [{ name: 'ghost_canvas_state' }];
    const probe = { siteTools: vi.fn(() => tools) } as unknown as CanvasProbe;
    const close = startCanvasRelay(window, probe, service);
    vi.runAllTimers();
    expect(connect).toHaveBeenCalledOnce();
    const [, actualTools, options] = connect.mock.calls[0];
    expect(actualTools).toBe(tools);
    expect(options.signal.aborted).toBe(false);
    close();
    expect(options.signal.aborted).toBe(true);
  });
  it('consumes an invitation once after the development mount replay', () => {
    window.history.replaceState(null, '', '/' + invitation);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    connect.mockResolvedValue({ close: vi.fn() });
    const probe = { siteTools: vi.fn(() => []) } as unknown as CanvasProbe;
    startCanvasRelay(window, probe, service)();
    const close = startCanvasRelay(window, probe, service);
    vi.runAllTimers();
    expect(confirm).toHaveBeenCalledOnce();
    expect(connect).toHaveBeenCalledOnce();
    expect(connect.mock.calls[0][2].signal.aborted).toBe(false);
    close();
  });
});
