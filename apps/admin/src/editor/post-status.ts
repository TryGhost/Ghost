import { useEffect, useRef, useState } from 'react';
import {
  getFullRecipientFilter,
  getNewsletterRecipientFilter,
} from '@tryghost/admin-x-framework/utils/recipient-filter';
import type { PostStatus } from '@tryghost/admin-x-framework/api/posts';
import type { SaveEngineState } from './engine/save-engine';

/** How long "Saving…" stays on screen once a save starts, so it is noticeable. */
export const SAVING_MIN_DISPLAY_MS = 3000;

export type EmailDeliveryStatus = 'pending' | 'submitting' | 'submitted' | 'failed';

export interface EditorStatusNewsletter {
  slug: string;
  visibility?: string;
}

export interface EditorStatusRecord {
  status?: PostStatus;
  publishedAt?: string | null;
  url?: string;
  emailOnly?: boolean;
  newsletter?: EditorStatusNewsletter | null;
  emailSegment?: string | null;
  /** An email record exists, so the send has already been handed over. */
  hasEmail?: boolean;
  emailStatus?: EmailDeliveryStatus | null;
  emailCount?: number;
}

export type EditorStatusView =
  /** A save the writer has to act on; the message is the engine's. */
  | { kind: 'problem'; message: string }
  | { kind: 'saving' }
  | { kind: 'new' }
  | { kind: 'draft'; saved: boolean }
  | {
      kind: 'scheduled';
      publishedAt: string | null;
      emailOnly: boolean;
      /** Members the send will reach, or null when nothing will be sent. */
      recipientFilter: string | null;
    }
  | {
      kind: 'published';
      url?: string;
      email: 'none' | 'sending' | 'sent' | 'failed';
      count: number;
    }
  | { kind: 'sent'; failed: boolean; count: number };

export interface DeriveEditorStatusInput {
  state: SaveEngineState;
  record?: EditorStatusRecord;
  isDirty: boolean;
  /** Held true for a minimum window after a save starts. */
  isSaving: boolean;
  now?: Date;
}

function publishedEmailState(
  status?: EmailDeliveryStatus | null,
): 'none' | 'sending' | 'sent' | 'failed' {
  if (status === 'submitting' || status === 'pending') {
    return 'sending';
  }
  if (status === 'submitted') {
    return 'sent';
  }
  return status === 'failed' ? 'failed' : 'none';
}

/** Who a scheduled send will reach, or null once an email exists or none is going out. */
function scheduledRecipientFilter(record: EditorStatusRecord): string | null {
  if (!record.newsletter || record.hasEmail) {
    return null;
  }

  return getFullRecipientFilter(
    getNewsletterRecipientFilter(record.newsletter),
    record.emailSegment,
  );
}

/** A scheduled post whose time has passed reads as published; the server owns the transition. */
function isPastScheduled(record: EditorStatusRecord, now: Date): boolean {
  if (record.status !== 'scheduled' || !record.publishedAt) {
    return false;
  }
  const time = Date.parse(record.publishedAt);
  return !Number.isNaN(time) && time <= now.getTime();
}

export function deriveEditorStatus({
  state,
  record,
  isDirty,
  isSaving,
  now = new Date(),
}: DeriveEditorStatusInput): EditorStatusView {
  // A collision has its own banner; a failed save has nowhere else to surface.
  if (state.kind === 'error') {
    return { kind: 'problem', message: state.error.message };
  }

  const status = record?.status ?? 'draft';

  if (isSaving && status === 'draft') {
    return { kind: 'saving' };
  }

  if (!record) {
    return { kind: 'new' };
  }

  const count = record.emailCount ?? 0;

  if (status === 'sent') {
    return { kind: 'sent', failed: record.emailStatus === 'failed', count };
  }

  if (record.emailOnly && status === 'scheduled') {
    return {
      kind: 'scheduled',
      publishedAt: record.publishedAt ?? null,
      emailOnly: true,
      recipientFilter: scheduledRecipientFilter(record),
    };
  }

  if (status === 'published' || isPastScheduled(record, now)) {
    return {
      kind: 'published',
      url: record.url,
      email: publishedEmailState(record.emailStatus),
      count,
    };
  }

  if (status === 'scheduled') {
    return {
      kind: 'scheduled',
      publishedAt: record.publishedAt ?? null,
      emailOnly: false,
      recipientFilter: scheduledRecipientFilter(record),
    };
  }

  return { kind: 'draft', saved: !isDirty };
}

/**
 * Holds `true` for `minMs` once a save starts. A save that begins inside the
 * window does not extend it; one still running when it closes opens a new one.
 */
export function useSavingHold(isSaving: boolean, minMs: number = SAVING_MIN_DISPLAY_MS): boolean {
  const [held, setHeld] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!isSaving || timer.current) {
      return;
    }
    setHeld(true);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setHeld(false);
    }, minMs);
  }, [isSaving, held, minMs]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return held;
}
