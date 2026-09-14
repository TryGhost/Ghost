import { useId } from 'react';
import { Label } from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import {
  settingsPublishDate,
  settingsPublishDateError,
  settingsPublishDateNote,
  settingsPublishTime,
} from '@tryghost/test-data/selectors/editor';
import { DateTimePicker } from '@/editor/publish/components/date-time-picker';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { PUBLISHED_AT_MUST_BE_PAST, publishedAtInFuture } from '@/editor/session/settings-fields';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { SettingsSection } from './settings-section';

/** A scheduled post is re-timed from the publish menu, not from here. */
const RESCHEDULE_NOTE = 'Use the publish menu to re-schedule';

export interface PublishDateSectionProps {
  session: EditorSessionHandle;
}

/**
 * When the post is published, in the site's timezone. A post that carries no
 * publish time yet shows now, and only an edit stages a value.
 */
export function PublishDateSection({ session }: PublishDateSectionProps) {
  const errorId = useId();
  const labelId = useId();
  const { data: settingsData } = useBrowseSettings({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const timezone = getSettingValue<string>(settingsData?.settings ?? null, 'timezone') ?? 'Etc/UTC';

  const { status, publishedAt } = session.publishTime;
  // Read per render: a value fixed at mount goes stale, and the calendar's cap
  // with it, as soon as the site's day turns over.
  const now = new Date().toISOString();
  const value = publishedAt ?? now;

  const isScheduled = status === 'scheduled';
  const isPastScheduled = isScheduled && !!publishedAt && Date.parse(publishedAt) < Date.now();
  const invalid = publishedAtInFuture(status, publishedAt);

  return (
    <SettingsSection>
      <Label id={labelId}>
        {isScheduled && !isPastScheduled ? 'Scheduled date' : 'Publish date'}
      </Label>
      <DateTimePicker
        dateLabel="Publish date"
        dateTestId={settingsPublishDate}
        describedBy={invalid ? errorId : undefined}
        disabled={isScheduled}
        invalid={invalid}
        labelledBy={labelId}
        // Ember caps the calendar at today; a past publish time is the rule.
        maxDate={now}
        timeLabel="Publish time"
        timeTestId={settingsPublishTime}
        timezone={timezone}
        value={value}
        onChange={(date) => session.editPublishedAt(date.toISOString())}
      />
      {invalid ? (
        <Text
          className="text-destructive"
          data-testid={settingsPublishDateError}
          id={errorId}
          role="alert"
          size="sm"
        >
          {PUBLISHED_AT_MUST_BE_PAST}
        </Text>
      ) : null}
      {isScheduled && !isPastScheduled ? (
        <Text data-testid={settingsPublishDateNote} size="sm" tone="secondary">
          {RESCHEDULE_NOTE}
        </Text>
      ) : null}
    </SettingsSection>
  );
}
