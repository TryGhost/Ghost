import { useBrowseConfig } from '../api/config';
import { useCurrentUser } from '../api/current-user';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DocsBotIdentify {
  name?: string;
  email?: string;
}

export interface DocsBotSupportTicket {
  subject: string;
  message: string;
}

export interface DocsBotHistoryEntry {
  Human?: string;
  AI?: string;
  timestamp?: string;
  type?: string;
}

export interface DocsBotMetadata {
  name?: string;
  email?: string;
  conversationId?: string;
  conversationUrl?: string;
  [key: string]: unknown;
}

export interface DocsBotSupportRequest {
  history: DocsBotHistoryEntry[];
  metadata: DocsBotMetadata;
  ticket: DocsBotSupportTicket | null;
  currentUrl: string;
}

type DocsBotSupportCallback = (
  event: Event,
  history: unknown[],
  metadata: unknown,
  ticket: DocsBotSupportTicket | null,
) => void;

interface DocsBotMountConfig {
  id: string;
  identify?: DocsBotIdentify;
  supportCallback?: DocsBotSupportCallback;
}

interface DocsBotAPI {
  mount?: (config: DocsBotMountConfig) => Promise<void>;
  unmount?: () => Promise<void>;
  open?: () => Promise<void>;
  close?: () => Promise<void>;
  addBotMessage?: (message: string) => Promise<void | false>;
}

declare global {
  interface Window {
    DocsBotAI?: DocsBotAPI;
  }
}

const SDK_URL = 'https://widget.docsbot.ai/chat.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function normalizeDocsBotHistory(history: unknown): DocsBotHistoryEntry[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history.filter(isRecord).map((entry) => ({
    Human: asOptionalString(entry.Human),
    AI: asOptionalString(entry.AI),
    timestamp: asOptionalString(entry.timestamp),
    type: asOptionalString(entry.type),
  }));
}

export function normalizeDocsBotMetadata(metadata: unknown): DocsBotMetadata {
  if (!isRecord(metadata)) {
    return {};
  }

  return { ...metadata };
}

export function normalizeDocsBotTicket(ticket: unknown): DocsBotSupportTicket | null {
  if (!isRecord(ticket)) {
    return null;
  }

  return {
    subject: typeof ticket.subject === 'string' ? ticket.subject : '',
    message: typeof ticket.message === 'string' ? ticket.message : '',
  };
}

function formatHistoryTimestamp(timestamp: string): string {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
  const date = new Date(hasZone ? timestamp : `${timestamp}Z`);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * Turns DocsBot's `{ Human | AI, timestamp }` history into a markdown
 * transcript suitable for attaching to a support ticket as a comment.
 */
export function formatDocsBotHistory(history: DocsBotHistoryEntry[]): string {
  const blocks: string[] = [];

  for (const entry of history) {
    const userText = entry.Human?.trim();
    const assistantText = entry.AI?.trim();
    const role = userText ? 'User' : assistantText ? 'Assistant' : null;
    const text = userText || assistantText;
    if (!role || !text) {
      continue;
    }

    const timestamp = entry.timestamp ? formatHistoryTimestamp(entry.timestamp) : null;
    const heading = timestamp ? `**${role}** (${timestamp})` : `**${role}**`;
    blocks.push(`${heading}\n${text}`);
  }

  return blocks.join('\n\n');
}

type SupportRequestListener = (request: DocsBotSupportRequest) => void;
let supportRequestListener: SupportRequestListener | null = null;

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

function handleSupportCallback(
  event: Event,
  history: unknown[],
  metadata: unknown,
  ticket: DocsBotSupportTicket | null,
): void {
  event.preventDefault();
  void window.DocsBotAI?.close?.();
  supportRequestListener?.({
    history: normalizeDocsBotHistory(history),
    metadata: normalizeDocsBotMetadata(metadata),
    ticket: normalizeDocsBotTicket(ticket),
    currentUrl: window.location.href,
  });
}

async function ensureWidgetMounted(id: string, identify?: DocsBotIdentify): Promise<void> {
  if (widgetMounted) {
    return;
  }
  await loadDocsBotSDK();
  if (!window.DocsBotAI?.mount) {
    throw new Error('[DocsBot] SDK loaded but mount() is unavailable');
  }
  await window.DocsBotAI.mount({
    id,
    ...(identify && { identify }),
    supportCallback: handleSupportCallback,
  });
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
    // DocsBot's unmount() promise never resolves, so awaiting it would block the queue
    void window.DocsBotAI?.unmount?.();
    widgetMounted = false;
  });
}

interface DocsBot {
  isAvailable: boolean;
  mountWidget: () => void;
  unmountWidget: () => void;
  supportRequest: DocsBotSupportRequest | null;
  clearSupportRequest: () => void;
  addBotMessage: (message: string) => Promise<void | false>;
  openWidget: () => Promise<void>;
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
  const [supportRequest, setSupportRequest] = useState<DocsBotSupportRequest | null>(null);

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

  useEffect(() => {
    supportRequestListener = setSupportRequest;
    return () => {
      supportRequestListener = null;
    };
  }, []);

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

  const clearSupportRequest = useCallback(() => {
    setSupportRequest(null);
  }, []);

  const addBotMessage = useCallback((message: string) => {
    return window.DocsBotAI?.addBotMessage?.(message) ?? Promise.resolve();
  }, []);

  const openWidget = useCallback(() => {
    return window.DocsBotAI?.open?.() ?? Promise.resolve();
  }, []);

  return {
    isAvailable,
    mountWidget,
    unmountWidget,
    supportRequest,
    clearSupportRequest,
    addBotMessage,
    openWidget,
  };
}
