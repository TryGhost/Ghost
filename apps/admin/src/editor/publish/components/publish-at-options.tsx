import { useId } from 'react';
import { Label, RadioGroup, RadioGroupItem } from '@tryghost/shade/components';
import { Grid, Inline } from '@tryghost/shade/primitives';
import { publishScheduleDate, publishScheduleTime } from '@tryghost/test-data/selectors/editor';
import { DateTimePicker } from '@/editor/date-time-picker';
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
  const id = useId();

  return (
    <Grid align="end" className="grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)]" gap="sm">
      <RadioGroup
        value={state.isScheduled ? 'schedule' : 'now'}
        onValueChange={(value) => onToggleScheduled(value === 'schedule')}
      >
        <Inline gap="sm">
          <RadioGroupItem id={`${id}-now`} value="now" />
          <Label htmlFor={`${id}-now`}>Set it live now</Label>
        </Inline>
        <Inline gap="sm">
          <RadioGroupItem id={`${id}-schedule`} value="schedule" />
          <Label htmlFor={`${id}-schedule`}>Schedule for later</Label>
        </Inline>
      </RadioGroup>

      {state.isScheduled ? (
        <DateTimePicker
          className="w-full sm:w-70 sm:translate-y-2 sm:justify-self-end"
          dateLabel="Publish date"
          dateTestId={publishScheduleDate}
          // A row of its own, so the fields stay level with their radio.
          errorClassName="sm:col-start-2 sm:w-70 sm:translate-y-2 sm:justify-self-end"
          minDate={state.minScheduledAt}
          timeLabel="Publish time"
          timeTestId={publishScheduleTime}
          timezone={timezone}
          value={state.scheduledAt}
          onChange={onSetScheduledAt}
        />
      ) : null}
    </Grid>
  );
}
