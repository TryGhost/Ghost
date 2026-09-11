import { useEffect, useRef, useState } from 'react';
import {
  EVERYONE_RECIPIENT_FILTER,
  PAID_SEGMENT,
  getFullRecipientFilter,
  getNewsletterRecipientFilter,
  normalizeRecipientFilter,
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
      /** The selected segment without its newsletter scope, for descriptive count copy. */
      recipientSegment: string | null;
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

interface ScheduledRecipientAudience {
  filter: string;
  segment: string;
}

/** Who a scheduled send will reach, or null once an email exists or none is going out. */
function scheduledRecipientAudience(record: EditorStatusRecord): ScheduledRecipientAudience | null {
  if (!record.newsletter || record.hasEmail || record.emailSegment === 'none') {
    return null;
  }

  const segment = normalizeRecipientFilter(record.emailSegment);
  const descriptiveSegment =
    segment ?? (record.newsletter.visibility === 'paid' ? PAID_SEGMENT : EVERYONE_RECIPIENT_FILTER);

  return {
    filter: getFullRecipientFilter(getNewsletterRecipientFilter(record.newsletter), segment),
    segment: descriptiveSegment,
  };
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
  const recipientAudience = status === 'scheduled' ? scheduledRecipientAudience(record) : null;

  if (status === 'sent') {
    return { kind: 'sent', failed: record.emailStatus === 'failed', count };
  }

  if (record.emailOnly && status === 'scheduled') {
    return {
      kind: 'scheduled',
      publishedAt: record.publishedAt ?? null,
      emailOnly: true,
      recipientFilter: recipientAudience?.filter ?? null,
      recipientSegment: recipientAudience?.segment ?? null,
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
      recipientFilter: recipientAudience?.filter ?? null,
      recipientSegment: recipientAudience?.segment ?? null,
    };
  }

  return { kind: 'draft', saved: !isDirty };
}

/** Browsers clamp longer timeouts; reschedule in bounded steps for distant posts. */
export const MAX_SCHEDULE_TIMEOUT_MS = 2_147_483_647;

/** Rerenders the caller when a future scheduled time is reached. */
export function useScheduledBoundary(
  publishedAt: string | null | undefined,
  enabled: boolean,
): void {
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!enabled || !publishedAt) {
      return;
    }

    const remaining = Date.parse(publishedAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      return;
    }

    const timer = setTimeout(
      () => setGeneration((current) => current + 1),
      Math.min(remaining, MAX_SCHEDULE_TIMEOUT_MS),
    );
    return () => clearTimeout(timer);
  }, [enabled, generation, publishedAt]);
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
