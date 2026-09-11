import { Label, RadioGroup, RadioGroupItem } from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { publishScheduleDate, publishScheduleTime } from '@tryghost/test-data/selectors/editor';
import { DateTimePicker } from '@/editor/publish/components/date-time-picker';
import type { PublishOptionsState } from '@/editor/publish/publish-options';

export interface PublishAtOptionsProps {
  state: PublishOptionsState;
  timezone: string;
  onToggleScheduled: (isScheduled: boolean) => void;
  onSetScheduledAt: (date: Date) => void;
}

export function PublishAtOptions({
  state,
  timezone,
  onToggleScheduled,
  onSetScheduledAt,
}: PublishAtOptionsProps) {
  return (
    <Stack gap="md">
      <RadioGroup
        value={state.isScheduled ? 'schedule' : 'now'}
        onValueChange={(value) => onToggleScheduled(value === 'schedule')}
      >
        <Inline gap="sm">
          <RadioGroupItem id="publish-at-now" value="now" />
          <Label htmlFor="publish-at-now">Set it live now</Label>
        </Inline>
        <Inline gap="sm">
          <RadioGroupItem id="publish-at-schedule" value="schedule" />
          <Label htmlFor="publish-at-schedule">Schedule for later</Label>
        </Inline>
      </RadioGroup>

      {state.isScheduled ? (
        <DateTimePicker
          dateLabel="Publish date"
          dateTestId={publishScheduleDate}
          minDate={state.minScheduledAt}
          timeLabel="Publish time"
          timeTestId={publishScheduleTime}
          timezone={timezone}
          value={state.scheduledAt}
          onChange={onSetScheduledAt}
        />
      ) : null}
    </Stack>
  );
}
