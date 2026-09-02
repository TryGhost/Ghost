import moment from 'moment-timezone';
import {
  Calendar,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useState } from 'react';
import { publishScheduleDate, publishScheduleTime } from '@tryghost/test-data/selectors/editor';
import type { PublishOptionsState } from '@/editor/publish/publish-options';

const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';

export interface PublishAtOptionsProps {
  state: PublishOptionsState;
  timezone: string;
  onToggleScheduled: (isScheduled: boolean) => void;
  onSetScheduledAt: (date: Date) => void;
}

/** The picker works in the site's timezone; the machine stores UTC. */
function inSiteTimezone(iso: string, timezone: string): moment.Moment {
  return moment.tz(iso, timezone);
}

export function PublishAtOptions({
  state,
  timezone,
  onToggleScheduled,
  onSetScheduledAt,
}: PublishAtOptionsProps) {
  const scheduled = inSiteTimezone(state.scheduledAt, timezone);
  // Null while the field is not being edited, so machine-side changes show through.
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const minimum = inSiteTimezone(state.minScheduledAt, timezone);

  const commitDate = (selected: Date | undefined) => {
    if (!selected) {
      return;
    }

    const next = scheduled.clone().set({
      year: selected.getFullYear(),
      month: selected.getMonth(),
      date: selected.getDate(),
    });

    setCalendarOpen(false);
    onSetScheduledAt(next.toDate());
  };

  const commitTime = (value: string) => {
    const normalized = /^\d:\d\d$/.test(value) ? `0${value}` : value;
    const [hour, minute] = normalized.split(':').map((part) => parseInt(part, 10));

    // An unparseable time reverts to the scheduled one, as the Ember field does.
    setTimeDraft(null);

    if (!/^\d\d:\d\d$/.test(normalized) || hour > 23 || minute > 59) {
      return;
    }

    onSetScheduledAt(scheduled.clone().set({ hour, minute }).toDate());
  };

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
        <Stack gap="sm">
          <Inline gap="sm">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Input
                  aria-label="Publish date"
                  data-testid={publishScheduleDate}
                  value={scheduled.format(DATE_FORMAT)}
                  readOnly
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  captionLayout="dropdown-months"
                  // Opening on the selected date's month, never today's.
                  defaultMonth={scheduled.toDate()}
                  disabled={{ before: minimum.clone().startOf('day').toDate() }}
                  mode="single"
                  selected={scheduled.toDate()}
                  onSelect={commitDate}
                />
              </PopoverContent>
            </Popover>
            <Input
              aria-label="Publish time"
              data-testid={publishScheduleTime}
              value={timeDraft ?? scheduled.format(TIME_FORMAT)}
              onBlur={(event) => commitTime(event.target.value)}
              onChange={(event) => setTimeDraft(event.target.value)}
            />
            <Inline className="shrink-0" gap="xs">
              <LucideIcon.Clock className="size-4" />
              <Text size="sm" tone="secondary">
                {scheduled.format('z')}
              </Text>
            </Inline>
          </Inline>
        </Stack>
      ) : null}
    </Stack>
  );
}
