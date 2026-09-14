import moment from 'moment-timezone';
import {
  Calendar,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useState } from 'react';
import { siteCalendarDay } from '@/editor/publish/publish-copy';

const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';

export interface DateTimePickerProps {
  /** The moment being edited, as an ISO instant. */
  value: string;
  timezone: string;
  /** Calendar days before this instant's site-timezone day are not selectable. */
  minDate?: string | null;
  /** Calendar days after this instant's site-timezone day are not selectable. */
  maxDate?: string | null;
  disabled?: boolean;
  dateLabel: string;
  timeLabel: string;
  dateTestId: string;
  timeTestId: string;
  invalid?: boolean;
  describedBy?: string;
  /** Names the pair as a group, for a caller whose own label is not on a field. */
  labelledBy?: string;
  onChange: (date: Date) => void;
}

/**
 * A date field, a time field and the site's timezone abbreviation. The writer
 * edits in the site's timezone; the caller is handed a real instant.
 */
export function DateTimePicker({
  value,
  timezone,
  minDate,
  maxDate,
  disabled = false,
  dateLabel,
  timeLabel,
  dateTestId,
  timeTestId,
  invalid = false,
  describedBy,
  labelledBy,
  onChange,
}: DateTimePickerProps) {
  const current = moment.tz(value, timezone);
  // Null while the field is not being edited, so caller-side changes show through.
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const commitDate = (selected: Date | undefined) => {
    if (!selected) {
      return;
    }

    // Read back the same way `siteCalendarDay` writes: local fields carry the
    // site-timezone day.
    const next = current.clone().set({
      year: selected.getFullYear(),
      month: selected.getMonth(),
      date: selected.getDate(),
      second: 0,
      millisecond: 0,
    });

    setCalendarOpen(false);
    if (!next.isSame(current, 'minute')) {
      onChange(next.toDate());
    }
  };

  const commitTime = (input: string) => {
    if (timeDraft === null) {
      return;
    }
    const normalized = /^\d:\d\d$/.test(input) ? `0${input}` : input;
    const [hour, minute] = normalized.split(':').map((part) => parseInt(part, 10));

    // An unparseable time reverts to the current one, as the Ember field does.
    setTimeDraft(null);

    if (
      !/^\d\d:\d\d$/.test(normalized) ||
      hour > 23 ||
      minute > 59 ||
      normalized === current.format(TIME_FORMAT)
    ) {
      return;
    }

    onChange(current.clone().set({ hour, minute, second: 0, millisecond: 0 }).toDate());
  };

  const invalidProps = invalid ? { 'aria-invalid': true } : {};
  const describedByProps = describedBy ? { 'aria-describedby': describedBy } : {};

  return (
    <Inline aria-labelledby={labelledBy} gap="sm" role={labelledBy ? 'group' : undefined}>
      <Popover open={calendarOpen && !disabled} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Input
            aria-label={dateLabel}
            data-testid={dateTestId}
            disabled={disabled}
            value={current.format(DATE_FORMAT)}
            readOnly
            {...invalidProps}
            {...describedByProps}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            captionLayout="dropdown-months"
            // Opening on the selected date's month, never today's.
            defaultMonth={siteCalendarDay(value, timezone)}
            disabled={[
              ...(minDate ? [{ before: siteCalendarDay(minDate, timezone) }] : []),
              ...(maxDate ? [{ after: siteCalendarDay(maxDate, timezone) }] : []),
            ]}
            mode="single"
            selected={siteCalendarDay(value, timezone)}
            onSelect={commitDate}
          />
        </PopoverContent>
      </Popover>
      <Input
        aria-label={timeLabel}
        data-testid={timeTestId}
        disabled={disabled}
        value={timeDraft ?? current.format(TIME_FORMAT)}
        onBlur={(event) => commitTime(event.target.value)}
        onChange={(event) => setTimeDraft(event.target.value)}
        {...invalidProps}
        {...describedByProps}
      />
      <Inline className="shrink-0" gap="xs">
        <LucideIcon.Clock className="size-4" />
        <Text size="sm" tone="secondary">
          {current.format('z')}
        </Text>
      </Inline>
    </Inline>
  );
}
