import { useEffect, useRef } from 'react';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { connectRelayEditor, validateServiceUrl } from '@tryghost/canvas-relay/client';
import type { RelayConnection } from '@tryghost/canvas-relay/client';
import type { CanvasProbe } from './canvas-probe';

import { owningCanvasWindow, readPairingLink } from './canvas-relay';

/** Redeem the CLI link only in the authenticated, mounted editor. Closing the
 * editor aborts its socket; the relay cannot deliver edits to an offline tab. */
export function CanvasAgentConnection({ probe }: { probe: CanvasProbe }) {
  const fetchApi = useFetchApi();
  const authorized = useRef<RelayConnection | null>(null);
  useEffect(() => {
    const owner = owningCanvasWindow();
    const lifetime = new AbortController();
    let configured: { url: string; tenant: string } | null = null;
    let attemptedLink: string | null = null;
    let connecting = false;
    const editorOptions = {
      signal: lifetime.signal,
      onStatus: (status: 'connected' | 'disconnected' | 'failed') => {
        if (status === 'failed' && !lifetime.signal.aborted) {
          authorized.current = null;
          connecting = false;
          // eslint-disable-next-line no-console
          console.error('Canvas agent session ended. Create a new CLI connection link.');
        }
      },
    };
    const connectFromLink = async () => {
      if (!configured || connecting || lifetime.signal.aborted) {
        return;
      }
      const url = new URL(owner.location.href);
      const [route, query = ''] = url.hash.split('?');
      const params = new URLSearchParams(query);
      if (
        route === '#/builder/theme' &&
        authorized.current &&
        (!params.has('canvasPairSession') ||
          params.get('canvasPairSession') === authorized.current.session)
      ) {
        const saved = authorized.current;
        if (saved.serviceUrl !== configured.url || saved.tenant !== configured.tenant) {
          authorized.current = null;
          return;
        }
        connecting = true;
        try {
          await connectRelayEditor(saved, probe.siteTools(lifetime.signal), editorOptions);
        } catch (cause) {
          if (!lifetime.signal.aborted) {
            connecting = false;
            // eslint-disable-next-line no-console
            console.error('Canvas agent connection failed:', cause);
          }
        }
        return;
      }
      if (
        route !== '#/builder/theme' ||
        !params.has('canvasPairSession') ||
        attemptedLink === url.href
      ) {
        return;
      }
      attemptedLink = url.href;
      connecting = true;
      try {
        const pairing = readPairingLink(url.href, owner);
        // Keep the link so authenticated startup can resume this same approved
        // session after reload. Bearer credentials never enter the URL.
        const result = await fetchApi<{ canvasRelay: RelayConnection }>(
          apiUrl('/canvas-relay/pair/'),
          {
            method: 'POST',
            retry: false,
            body: JSON.stringify({ canvasRelay: [pairing] }),
          },
        );
        if (lifetime.signal.aborted) {
          return;
        }
        const approved = result.canvasRelay;
        if (
          approved.serviceUrl !== configured.url ||
          approved.tenant !== configured.tenant ||
          approved.session !== pairing.session
        ) {
          throw new Error('Ghost returned a different connection.');
        }
        authorized.current = approved;
        await connectRelayEditor(approved, probe.siteTools(lifetime.signal), editorOptions);
      } catch (cause) {
        if (!lifetime.signal.aborted) {
          connecting = false;
          // Connection diagnostics stay outside the canvas UI.
          // eslint-disable-next-line no-console
          console.error('Canvas agent connection failed:', cause);
        }
      }
    };
    const onHashChange = () => void connectFromLink();
    owner.addEventListener('hashchange', onHashChange);
    void fetchApi<{ canvasRelay: { url: string; tenant: string } | null }>(
      apiUrl('/canvas-relay/'),
      { retry: false },
    )
      .then((result) => {
        // StrictMode discards the first mount effect. Its asynchronous discovery
        // must never consume the one-use pairing code.
        if (!lifetime.signal.aborted && result.canvasRelay) {
          validateServiceUrl(result.canvasRelay.url);
          configured = result.canvasRelay;
          void connectFromLink();
        }
      })
      .catch(() => {
        /* Unavailable or older backend: no agent connection. */
      });
    return () => {
      lifetime.abort();
      owner.removeEventListener('hashchange', onHashChange);
    };
  }, [fetchApi, probe]);
  return null;
}
