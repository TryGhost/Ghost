import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { membersCountString, useMembersCount } from '@tryghost/admin-x-framework/api/members';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import { getNewsletterRecipientFilter } from '@tryghost/admin-x-framework/utils/recipient-filter';
import { NEWSLETTERS_SEARCH_PARAMS } from './browse-params';
import { scheduledRecipientAudience } from './post-status';
import { postPreviewUrl } from './preview/preview-url';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { describeRevertToast, describeSaveToast, type SaveToast } from './save-toast';
import { useSiteTimezone } from './use-editor-settings';
import type { SaveCompletion } from './engine/save-engine';
import type { EditorSaveResult } from './session/editor-session';
import type { EditorRecord } from './session/projection';
import type { EditorSessionHandle } from './session/use-editor-session';

// Sonner keeps a dismissed id flagged for removal, so reusing one hides the new toast.
let saveToastSeq = 0;

/** How long a save button reads as saved before it returns to its label. */
export const SAVE_STATUS_DURATION_MS = 2500;

function scheduledAudienceOf(record: EditorRecord | undefined) {
  if (!record || !('newsletter' in record) || !record.newsletter) {
    return null;
  }

  const audience = scheduledRecipientAudience({
    newsletter: record.newsletter,
    hasEmail: !!record.email,
    emailSegment: record.email_segment,
  });

  return audience ? { ...audience, newsletter: record.newsletter } : null;
}

function savedRecordOf(completion: SaveCompletion): EditorRecord | undefined {
  if (completion.kind !== 'saved' || !('post' in completion.result)) {
    return undefined;
  }
  return (completion.result as EditorSaveResult).post;
}

function showSaveToast({ title, description, action }: SaveToast): string {
  saveToastSeq += 1;
  const id = `editor-save-${saveToastSeq}`;
  toast.success(title, {
    id,
    description: description ? (
      <>
        {description.map(({ text, strong }) =>
          strong ? <strong key={`strong:${text}`}>{text}</strong> : <span key={text}>{text}</span>,
        )}
      </>
    ) : undefined,
    action: action ? (
      <a
        className="ml-auto shrink-0 text-sm font-semibold text-foreground underline"
        href={action.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {action.label}
      </a>
    ) : undefined,
  });
  return id;
}

interface SaveFeedbackSources {
  session: EditorSessionHandle;
  displayName: 'post' | 'page';
  siteUrl: string;
}

/**
 * Explicit saves that report what they did: each one clears the last save
 * toast and, once the server acknowledges it, describes the post's new state.
 */
export function useSaveFeedback({ session, displayName, siteUrl }: SaveFeedbackSources) {
  const timezone = useSiteTimezone();
  const audience = scheduledAudienceOf(session.loadedRecord);
  const { count } = useMembersCount(audience?.filter ?? null, {
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const { data: newslettersData } = useBrowseNewsletters({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
    searchParams: NEWSLETTERS_SEARCH_PARAMS,
    enabled: audience !== null,
  });
  const activeNewsletters = (newslettersData?.newsletters ?? []).filter(
    (newsletter) => newsletter.status === 'active',
  ).length;

  const sources = {
    session,
    displayName,
    siteUrl,
    timezone,
    audience,
    count,
    hasMultipleNewsletters: activeNewsletters > 1,
  };
  const latest = useRef(sources);
  latest.current = sources;
  const lastToastId = useRef<string | null>(null);

  const show = useCallback((described: SaveToast) => {
    if (lastToastId.current) {
      toast.dismiss(lastToastId.current);
    }
    lastToastId.current = showSaveToast(described);
  }, []);

  const save = useCallback(async (): Promise<SaveCompletion> => {
    const previousStatus = latest.current.session.publishTime.status;
    if (lastToastId.current) {
      toast.dismiss(lastToastId.current);
      lastToastId.current = null;
    }

    const completion = await latest.current.session.saveExplicit();

    // A status change came from a publish command queued ahead of this save, not from it.
    if (completion.kind !== 'saved' || completion.result.status !== previousStatus) {
      return completion;
    }

    const current = latest.current;
    const record = savedRecordOf(completion) ?? current.session.loadedRecord;
    const savedAudience = scheduledAudienceOf(record);
    const recipients = savedAudience
      ? membersCountString(savedAudience.segment, {
          count: savedAudience.filter === current.audience?.filter ? current.count : undefined,
          newsletter: {
            name: savedAudience.newsletter.name,
            recipientFilter: getNewsletterRecipientFilter(savedAudience.newsletter),
          },
          hasMultipleNewsletters: current.hasMultipleNewsletters,
        })
      : null;
    const described = describeSaveToast({
      displayName: current.displayName,
      previousStatus,
      status: completion.result.status,
      url: record?.url,
      previewUrl: postPreviewUrl(current.siteUrl, record?.uuid),
      publishedAt: record?.published_at,
      timezone: current.timezone,
      emailOnly: !!record && 'email_only' in record && record.email_only === true,
      recipients,
    });

    if (described) {
      show(described);
    }
    return completion;
  }, [show]);

  const showReverted = useCallback(() => {
    show(describeRevertToast(latest.current.displayName));
  }, [show]);

  return { save, showReverted };
}

export type SaveButtonPhase = 'idle' | 'running' | 'success' | 'failure';

/** A save button's progress belongs to the document its click asked to save. */
export function useSaveButtonPhase(save: () => Promise<SaveCompletion>, contentKey: number) {
  const [phase, setPhase] = useState<SaveButtonPhase>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mounted = useRef(true);
  const generation = useRef(0);

  useLayoutEffect(() => {
    mounted.current = true;
    generation.current += 1;
    // Reloads and revision restores replace the document without remounting the header.
    setPhase('idle');
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, [contentKey]);

  const run = useCallback(async () => {
    const startedGeneration = generation.current;
    clearTimeout(timer.current);
    setPhase('running');

    let completion: SaveCompletion | null = null;
    try {
      completion = await save();
    } finally {
      if (mounted.current && generation.current === startedGeneration) {
        if (completion?.kind === 'saved') {
          setPhase('success');
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setPhase('idle'), SAVE_STATUS_DURATION_MS);
        } else {
          setPhase(completion === null || completion.kind === 'failed' ? 'failure' : 'idle');
        }
      }
    }
  }, [save]);

  return { phase, run };
}
