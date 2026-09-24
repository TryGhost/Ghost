import { useEffect, useState } from 'react';
import { Text } from '@tryghost/shade/primitives';
import { buttonVariants } from '@tryghost/shade/components';
import { useShade } from '@tryghost/shade/app';
import { formatNumber } from '@tryghost/shade/utils';
import { membersCountString, useMembersCount } from '@tryghost/admin-x-framework/api/members';
import { editorScheduleCountdown, editorStatus } from '@tryghost/test-data/selectors/editor';
import { formatPostTime } from '@/posts/list/post-time';
import { EDITOR_REQUEST_OPTIONS } from './request-options';
import { useSiteTimezone } from './use-editor-settings';
import type { SaveEngineState } from './engine/save-engine';
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

function StatusBody({
  view,
  timezone,
  isHovered,
}: {
  view: EditorStatusView;
  timezone: string;
  isHovered: boolean;
}) {
  switch (view.kind) {
    case 'problem':
      return <span className="text-destructive">{view.message}</span>;
    case 'saving':
      return <>Saving…</>;
    case 'new':
      return <>New</>;
    case 'draft':
      return <>{view.saved ? 'Draft - Saved' : 'Draft'}</>;
    case 'sent':
      return view.failed ? <>Failed to send newsletter.</> : <>Sent to {members(view.count)}</>;
    case 'scheduled':
      return (
        <>
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
        </>
      );
    default:
      return (
        <>
          {view.url ? (
            <a
              className="hover:text-foreground"
              href={view.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              Published
            </a>
          ) : (
            'Published'
          )}
          {view.email === 'sending' && ` and sending to ${members(view.count)}`}
          {view.email === 'sent' && ` and sent to ${members(view.count)}`}
          {view.email === 'failed' && ' but failed to send newsletter.'}
        </>
      );
  }
}

export interface EditorStatusProps {
  state: SaveEngineState;
  record?: EditorStatusRecord;
  isDirty: boolean;
}

/** Where the post stands: its status, the newsletter, and the last save. */
export function EditorStatus({ state, record, isDirty }: EditorStatusProps) {
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

  return (
    <Text
      as="span"
      className={buttonVariants({
        variant: null,
        size: isAdmin7 ? 'default' : 'sm',
        shape: 'pill',
        isAdmin7,
        className: `pointer-events-auto h-auto max-w-full min-w-0 justify-self-start bg-background/80 px-3 py-1 text-(length:--text-control) whitespace-normal text-text-secondary backdrop-blur-sm max-sm:col-span-2 max-sm:row-start-2 ${isAdmin7 ? 'min-h-(--control-height)' : 'min-h-7'}`,
      })}
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
          view={deriveEditorStatus({ state, record, isDirty, isSaving })}
        />
      </span>
    </Text>
  );
}
