import { connectRelayEditor, validateServiceUrl } from '@tryghost/canvas-relay/client';
import type { RelayConnection } from '@tryghost/canvas-relay/client';
import type { CanvasProbe } from './canvas-probe';

const invitationKeys = ['canvasRelayTenant', 'canvasRelaySession', 'canvasRelayToken'];
export function readCanvasRelayInvitation(
  hash: string,
  serviceUrl: string,
): RelayConnection | null {
  const query = hash.indexOf('?');
  if (query < 0 || hash.slice(0, query) !== '#/builder/theme') {
    return null;
  }
  const params = new URLSearchParams(hash.slice(query + 1));
  const [tenant, session, token] = invitationKeys.map((key) => params.get(key));
  if (
    !tenant ||
    !session ||
    !token ||
    token.length > 8192 ||
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(tenant) ||
    !/^[0-9a-f-]{36}$/.test(session)
  ) {
    return null;
  }
  return { serviceUrl: validateServiceUrl(serviceUrl), tenant, session, token };
}

/** Development-only first-party relay seam. Called after the authenticated theme
 * workspace mounts, never from sign-in or a sandboxed preview document. */
export function startCanvasRelay(
  owner: Window,
  probe: CanvasProbe,
  serviceUrl: string,
): () => void {
  let disconnect = () => {};
  // React StrictMode replays mount effects in development. Wait until that
  // synchronous replay finishes before consuming a one-use invitation.
  const timer = owner.setTimeout(() => {
    disconnect = connectCanvasRelay(owner, probe, serviceUrl);
  }, 0);
  return () => {
    owner.clearTimeout(timer);
    disconnect();
  };
}

function connectCanvasRelay(owner: Window, probe: CanvasProbe, serviceUrl: string): () => void {
  let invitation: RelayConnection | null;
  try {
    invitation = readCanvasRelayInvitation(owner.location.hash, serviceUrl);
  } catch {
    owner.alert(
      'The preview connection service is misconfigured. Ask your agent to check its setup.',
    );
    return () => {};
  }
  if (!invitation) {
    return () => {};
  }
  const [route, query = ''] = owner.location.hash.split('?');
  const params = new URLSearchParams(query);
  invitationKeys.forEach((key) => params.delete(key));
  const cleanHash = route + (params.size ? `?${params}` : '');
  owner.history.replaceState(
    owner.history.state,
    '',
    owner.location.pathname + owner.location.search + cleanHash,
  );
  if (
    !owner.confirm(
      'Allow your agent to edit this theme? Changes stay in the editor until you publish.',
    )
  ) {
    return () => {};
  }
  const lifetime = new AbortController();
  void connectRelayEditor(invitation, probe.siteTools(lifetime.signal), {
    signal: lifetime.signal,
  }).catch(() => {
    if (!lifetime.signal.aborted) {
      owner.alert('The agent could not connect. Ask it to create a new preview connection.');
    }
  });
  return () => lifetime.abort();
}

export function owningCanvasWindow(): Window {
  try {
    return window.top?.document.defaultView ?? window;
  } catch {
    return window;
  }
}

export function readPairingLink(value: string, owner: Window) {
  const url = new URL(value);
  if (
    url.origin !== owner.location.origin ||
    url.pathname !== owner.location.pathname ||
    !url.hash.startsWith('#/builder/theme?')
  ) {
    throw new Error('Use the connection link for this Ghost site.');
  }
  const params = new URLSearchParams(url.hash.slice(url.hash.indexOf('?') + 1));
  const session = params.get('canvasPairSession');
  const code = params.get('canvasPairCode');
  if (
    !session ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(session) ||
    !code ||
    !/^[A-F0-9]{8}$/.test(code)
  ) {
    throw new Error('The connection link is invalid or incomplete.');
  }
  return { session, code };
}
