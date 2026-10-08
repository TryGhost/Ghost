import { useEffect, useState } from 'react';
import { Text } from '@tryghost/shade/primitives';
import { Button, buttonVariants } from '@tryghost/shade/components';
import { useShade } from '@tryghost/shade/app';
import { cn, formatNumber } from '@tryghost/shade/utils';
import { membersCountString, useMembersCount } from '@tryghost/admin-x-framework/api/members';
import {
  editorSaveError,
  editorScheduleCountdown,
  editorStatus,
} from '@tryghost/test-data/selectors/editor';
import { formatPostTime } from '@/posts/list/post-time';
import { ErrorLine, FailureMessage } from './publish/components/failure-banner';
import { hostLimitFailure } from './publish/completion-message';
import { usePublishInputs } from './publish/use-publish-inputs';
import { reportShownAlert } from './report-error';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { useSiteTimezone } from './use-editor-settings';
import type { PendingSave, SaveEngineState } from './engine/save-engine';
import {
  type EditorStatusRecord,
  type EditorStatusView,
  deriveEditorStatus,
  useScheduledBoundary,
  useSavingHold,
} from './post-status';

function members(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'member' : 'members'}`;
}

/** The send's audience, counted the way the publish flow counts it. */
export function RecipientCount({ filter, segment }: { filter: string; segment: string }) {
  const { count } = useMembersCount(filter, { requestOptions: EDITOR_REQUEST_OPTIONS });
  return <>{typeof count === 'number' ? members(count) : membersCountString(segment, { count })}</>;
}

function ScheduleCountdown({
  publishedAt,
  emailOnly,
  recipientFilter,
  recipientSegment,
  timezone,
}: {
  publishedAt: string | null;
  emailOnly: boolean;
  recipientFilter: string | null;
  recipientSegment: string | null;
  timezone: string;
}) {
  return (
    <time
      className="text-state-success"
      data-testid={editorScheduleCountdown}
      dateTime={publishedAt ?? undefined}
    >
      {emailOnly ? 'to be sent' : 'to be published'}
      {recipientFilter && recipientSegment && (
        <>
          {emailOnly ? ' to ' : ' and sent to '}
          <RecipientCount filter={recipientFilter} segment={recipientSegment} />
        </>
      )}{' '}
      {formatPostTime(publishedAt, { timezone, scheduled: true })}
    </time>
  );
}

/** Opens the publish flow, which starts at its email-failure step for a failed send. */
function EmailFailureAction({ label, onOpen }: { label: string; onOpen: () => void }) {
  // The flow is built from the publish inputs, so it cannot open before they load.
  const { isReady } = usePublishInputs();

  return (
    <>
      {' '}
      <Button
        className="h-auto gap-1 p-0 text-destructive"
        disabled={!isReady}
        variant="link"
        onClick={onOpen}
      >
        <span className="underline underline-offset-4">{label}</span>
        <span aria-hidden="true">&rarr;</span>
      </Button>
    </>
  );
}

/** Opens the update flow, which describes what was sent. */
function SentAction({ onOpen }: { onOpen: () => void }) {
  // The flow is built from the publish inputs, so it cannot open before they load.
  const { isReady } = usePublishInputs();

  return (
    <Button className="h-auto p-0" disabled={!isReady} variant="link" onClick={onOpen}>
      Sent
    </Button>
  );
}

/** A failed or refused save: what went wrong, the upgrade link a host limit names, and a retry where one helps. */
function SaveProblem({
  view,
  onRetrySave,
}: {
  view: Extract<EditorStatusView, { kind: 'problem' }>;
  onRetrySave?: () => void;
}) {
  const { error, message } = view;

  // Once per failure the writer reads, not per render of it.
  useEffect(() => {
    reportShownAlert(message, error);
  }, [message, error]);

  return (
    <ErrorLine className="text-destructive" data-testid={editorSaveError}>
      <span role="alert">
        <FailureMessage
          failure={error.kind === 'host-limit' ? hostLimitFailure(message) : { message }}
        />
      </span>
      {view.retryable && onRetrySave ? (
        <>
          {' '}
          <Button className="h-auto p-0 text-destructive" variant="link" onClick={onRetrySave}>
            Retry
          </Button>
        </>
      ) : null}
    </ErrorLine>
  );
}

function StatusBody({
  view,
  timezone,
  isHovered,
  onOpenPublishFlow,
  onOpenUpdateFlow,
  onRetrySave,
}: {
  view: Exclude<EditorStatusView, { kind: 'new' }>;
  timezone: string;
  isHovered: boolean;
  onOpenPublishFlow?: () => void;
  onOpenUpdateFlow?: () => void;
  onRetrySave?: () => void;
}) {
  switch (view.kind) {
    case 'problem':
      return <SaveProblem view={view} onRetrySave={onRetrySave} />;
    case 'saving':
      return <>Saving…</>;
    case 'draft':
      return <>{view.saved ? 'Draft - Saved' : 'Draft'}</>;
    case 'sent':
      return view.failed ? (
        <ErrorLine className="text-destructive">
          Failed to send newsletter.
          {onOpenPublishFlow ? (
            <EmailFailureAction label="Retry now" onOpen={onOpenPublishFlow} />
          ) : null}
        </ErrorLine>
      ) : onOpenUpdateFlow ? (
        <>
          <SentAction onOpen={onOpenUpdateFlow} /> to {members(view.count)}
        </>
      ) : (
        <>Sent to {members(view.count)}</>
      );
    case 'scheduled':
      return (
        <span className="text-state-success">
          Scheduled
          {isHovered && (
            <>
              {' '}
              <ScheduleCountdown
                emailOnly={view.emailOnly}
                publishedAt={view.publishedAt}
                recipientFilter={view.recipientFilter}
                recipientSegment={view.recipientSegment}
                timezone={timezone}
              />
            </>
          )}
        </span>
      );
    default: {
      const published = view.url ? (
        <a
          className={view.email === 'failed' ? undefined : 'hover:text-foreground'}
          href={view.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          Published
        </a>
      ) : (
        'Published'
      );

      if (view.email === 'failed') {
        return (
          <ErrorLine className="text-destructive">
            {published} but failed to send newsletter.
            {onOpenPublishFlow ? (
              <EmailFailureAction label="View details" onOpen={onOpenPublishFlow} />
            ) : null}
          </ErrorLine>
        );
      }

      return (
        <>
          {published}
          {view.email === 'sending' && ` and sending to ${members(view.count)}`}
          {view.email === 'sent' && ` and sent to ${members(view.count)}`}
        </>
      );
    }
  }
}

export interface EditorStatusProps {
  state: SaveEngineState;
  /** Work the engine is holding back; a collision blocking it leaves the retry to its banner. */
  pendingSave?: PendingSave | null;
  record?: EditorStatusRecord;
  isDirty: boolean;
  /** Opens the publish flow at a failed send; omitted unless the role may retry it. */
  onOpenPublishFlow?: () => void;
  /** Opens the update flow from a sent post's "Sent"; omitted unless the role may publish. */
  onOpenUpdateFlow?: () => void;
  /** Retries the failed save the status line reports. */
  onRetrySave?: () => void;
}

/**
 * Where the post stands: its status, the newsletter, and the last save. A save
 * that failed or was refused replaces the status until a later save lands.
 */
export function EditorStatus({
  state,
  pendingSave,
  record,
  isDirty,
  onOpenPublishFlow,
  onOpenUpdateFlow,
  onRetrySave,
}: EditorStatusProps) {
  const { isAdmin7 } = useShade();
  const timezone = useSiteTimezone();
  const isSaving = useSavingHold(state.kind === 'saving' || state.kind === 'pending-coalesced');
  const [isHovered, setIsHovered] = useState(false);
  const [, setTick] = useState(0);

  useScheduledBoundary(
    record?.publishedAt,
    record?.status === 'scheduled' && record.emailOnly !== true,
  );

  // The countdown only reads while hovered, so it only has to tick then.
  useEffect(() => {
    if (!isHovered) {
      return;
    }
    const interval = setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const view = deriveEditorStatus({ state, pendingSave, record, isDirty, isSaving });
  // A post that has never been saved has no status yet. Its first save still
  // reads "Saving…", and a failed one still reports the problem.
  if (view.kind === 'new') {
    return null;
  }

  return (
    <Text
      as="span"
      // Its first line sits where a one-line status centres it, level with the
      // back link's label, so a wrapped status grows downward from there.
      className={cn(
        buttonVariants({
          variant: null,
          size: isAdmin7 ? 'default' : 'sm',
          shape: 'pill',
          isAdmin7,
        }),
        'pointer-events-auto h-auto max-w-full min-w-0 items-start justify-self-start bg-background/80 px-3 text-(length:--text-control) whitespace-normal text-text-secondary backdrop-blur-sm max-sm:col-span-2 max-sm:row-start-2',
        isAdmin7
          ? 'min-h-(--control-height) py-[calc((var(--control-height)-1lh)/2)]'
          : 'min-h-7 py-[calc((--spacing(7)-1lh)/2)]',
      )}
      data-testid={editorStatus}
      tone="secondary"
      weight="medium"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="min-w-0 break-words">
        <StatusBody
          isHovered={isHovered}
          timezone={timezone}
          view={view}
          onOpenPublishFlow={onOpenPublishFlow}
          onOpenUpdateFlow={onOpenUpdateFlow}
          onRetrySave={onRetrySave}
        />
      </span>
    </Text>
  );
}
