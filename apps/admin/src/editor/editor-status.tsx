import { useEffect, useState } from 'react';
import { Inline, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import { formatPostTime } from '@/posts/list/post-time';
import type { SaveEngineState } from './engine/save-engine';
import {
  type EditorStatusRecord,
  type EditorStatusView,
  deriveEditorStatus,
  useSavingHold,
} from './post-status';

function members(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'member' : 'members'}`;
}

/** The send's audience, counted the way the publish flow counts it. */
function RecipientCount({ filter }: { filter: string }) {
  const { count } = useMembersCount(filter);
  return <>{members(count ?? 0)}</>;
}

function ScheduleCountdown({
  publishedAt,
  emailOnly,
  recipientFilter,
  timezone,
}: {
  publishedAt: string | null;
  emailOnly: boolean;
  recipientFilter: string | null;
  timezone: string;
}) {
  return (
    <time
      className="text-state-success"
      data-testid="editor-schedule-countdown"
      dateTime={publishedAt ?? undefined}
    >
      {emailOnly ? 'to be sent' : 'to be published'}
      {recipientFilter && (
        <>
          {emailOnly ? ' to ' : ' and sent to '}
          <RecipientCount filter={recipientFilter} />
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
      return <Text className="text-state-danger">{view.message}</Text>;
    case 'saving':
      return <Text tone="secondary">Saving…</Text>;
    case 'new':
      return <Text tone="secondary">New</Text>;
    case 'draft':
      return <Text tone="secondary">{view.saved ? 'Draft - Saved' : 'Draft'}</Text>;
    case 'sent':
      return view.failed ? (
        <Text tone="secondary">Failed to send newsletter.</Text>
      ) : (
        <Text tone="secondary">Sent to {members(view.count)}</Text>
      );
    case 'scheduled':
      return (
        <Text tone="secondary">
          Scheduled
          {isHovered && (
            <>
              {' '}
              <ScheduleCountdown
                emailOnly={view.emailOnly}
                publishedAt={view.publishedAt}
                recipientFilter={view.recipientFilter}
                timezone={timezone}
              />
            </>
          )}
        </Text>
      );
    default:
      return (
        <Text tone="secondary">
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
        </Text>
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
  const { data: settingsData } = useBrowseSettings();
  const timezone = getSettingValue<string>(settingsData?.settings ?? null, 'timezone') ?? 'Etc/UTC';
  const isSaving = useSavingHold(state.kind === 'saving' || state.kind === 'pending-coalesced');
  const [isHovered, setIsHovered] = useState(false);
  const [, setTick] = useState(0);

  // The countdown only reads while hovered, so it only has to tick then.
  useEffect(() => {
    if (!isHovered) {
      return;
    }
    const interval = setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <Inline
      align="center"
      className="text-sm"
      data-testid="editor-status"
      gap="xs"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <StatusBody
        isHovered={isHovered}
        timezone={timezone}
        view={deriveEditorStatus({ state, record, isDirty, isSaving })}
      />
    </Inline>
  );
}
