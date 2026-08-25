import { useBrowseConfig } from '../api/config';
import { useCurrentUser } from '../api/current-user';
import { useCallback, useRef } from 'react';

interface DocsBotIdentify {
  name?: string;
  email?: string;
}

interface DocsBotAPI {
  mount?: (config: { id: string; identify?: DocsBotIdentify }) => Promise<void>;
  unmount?: () => Promise<void>;
  open?: () => Promise<void>;
}

declare global {
  interface Window {
    DocsBotAI?: DocsBotAPI;
  }
}

const SDK_URL = 'https://widget.docsbot.ai/chat.js';

let docsBotSDKPromise: Promise<void> | null = null;
function loadDocsBotSDK(): Promise<void> {
  if (!docsBotSDKPromise) {
    docsBotSDKPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${SDK_URL}"]`);
      if (existingScript) {
        if (window.DocsBotAI?.mount) {
          resolve();
          return;
        }
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (event) => {
        script.remove();
        docsBotSDKPromise = null;
        const error = new Error(`[DocsBot] Failed to load SDK from ${SDK_URL}`, {
          cause: event,
        });
        // eslint-disable-next-line no-console
        console.error(error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }
  return docsBotSDKPromise;
}

let widgetOperationChain: Promise<void> = Promise.resolve();
let widgetMounted = false;

function enqueueWidgetOperation(operation: () => Promise<void>): Promise<void> {
  const next = widgetOperationChain.then(operation);
  widgetOperationChain = next.catch(() => {});
  return next;
}

async function ensureWidgetMounted(id: string, identify?: DocsBotIdentify): Promise<void> {
  if (widgetMounted) {
    return;
  }
  await loadDocsBotSDK();
  if (!window.DocsBotAI?.mount) {
    throw new Error('[DocsBot] SDK loaded but mount() is unavailable');
  }
  await window.DocsBotAI.mount({ id, ...(identify && { identify }) });
  widgetMounted = true;
}

function mountDocsBotWidget(id: string, identify?: DocsBotIdentify): Promise<void> {
  return enqueueWidgetOperation(() => ensureWidgetMounted(id, identify));
}

function unmountDocsBotWidget(): void {
  void enqueueWidgetOperation(async () => {
    if (!widgetMounted) {
      return;
    }
    await window.DocsBotAI?.unmount?.();
    widgetMounted = false;
  });
}

interface DocsBot {
  isAvailable: boolean;
  mountWidget: () => void;
  unmountWidget: () => void;
}

/**
 * Lazy-loads the DocsBot.ai chat widget (https://docsbot.ai/documentation/developer/embeddable-chat-widget).
 *
 *
 * `mountWidget` renders DocsBot's own floating chat bubble
 */
export function useDocsBot(): DocsBot {
  const { data: config } = useBrowseConfig();
  const { data: currentUser } = useCurrentUser();

  const { enabled, id } = config?.config.docsbot ?? {};
  // The /config/ response isn't runtime-validated, so guard against a
  // misconfigured host config supplying a non-string id.
  const isAvailable = !!enabled && typeof id === 'string' && id !== '';

  // Identity is read through a ref so the callbacks stay referentially stable
  // across user refetches — a changed identity would remount the widget.
  const identifyRef = useRef<DocsBotIdentify | undefined>(undefined);
  identifyRef.current = currentUser
    ? { name: currentUser.name, email: currentUser.email }
    : undefined;

  const mountWidget = useCallback(() => {
    if (!isAvailable || !id) {
      return;
    }
    mountDocsBotWidget(id, identifyRef.current).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[DocsBot] Failed to mount widget:', err);
    });
  }, [isAvailable, id]);

  const unmountWidget = useCallback(() => {
    unmountDocsBotWidget();
  }, []);

  return { isAvailable, mountWidget, unmountWidget };
}
