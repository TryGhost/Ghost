import moment from 'moment-timezone';
import {
  Calendar,
  FieldError,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { Grid } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { siteCalendarDay } from '@/editor/publish/publish-copy';

const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';

const INVALID_DATE_FORMAT = 'Invalid date format, must be YYYY-MM-DD';
const INVALID_DATE = 'Invalid date';
const INVALID_TIME = 'Must be in format: "15:00"';

/** The message refusing a typed date, or null for a real YYYY-MM-DD day. */
function typedDateError(input: string, timezone: string): string | null {
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(input)) {
    return INVALID_DATE_FORMAT;
  }
  return moment.tz(input, DATE_FORMAT, timezone).isValid() ? null : INVALID_DATE;
}

/** A typed H:mm or HH:mm time on the 24-hour clock, or null. */
function typedTime(input: string): { hour: number; minute: number } | null {
  const match = /^(\d?\d):(\d\d)$/.exec(input);
  if (!match) {
    return null;
  }
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  return hour > 23 || minute > 59 ? null : { hour, minute };
}

function isSaveChord(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 's';
}

export interface DateTimePickerProps {
  /** The moment being edited, as an ISO instant. */
  value: string;
  timezone: string;
  /** Calendar days before this instant's site-timezone day are not selectable. */
  minDate?: string | null;
  /** Calendar days after this instant's site-timezone day are not selectable. */
  maxDate?: string | null;
  disabled?: boolean;
  /** For the fields' grid. */
  className?: string;
  /** For a typed date's or time's refusal, rendered after the fields as a sibling the caller places. */
  errorClassName?: string;
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
 * A date field and a time field led by the site's timezone abbreviation. The
 * writer edits in the site's timezone; the caller is handed a real instant. The date
 * is typed as YYYY-MM-DD or picked from a calendar, which the field's button
 * opens with focus inside it and a click on the field opens beside the caret. The
 * time is typed as 24-hour HH:mm.
 */
export function DateTimePicker({
  value,
  timezone,
  minDate,
  maxDate,
  disabled = false,
  className,
  errorClassName,
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
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Not reset on close: the close's focus handling still reads it.
  const [calendarFrom, setCalendarFrom] = useState<'button' | 'field'>('button');
  const interactedOutside = useRef(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const dateErrorId = useId();
  const timeErrorId = useId();

  const commitDay = (day: string) => {
    // Parsed rather than set, so a held time the day's clock change skips moves forward.
    const next = moment.tz(
      `${day} ${current.format(TIME_FORMAT)}`,
      `${DATE_FORMAT} ${TIME_FORMAT}`,
      timezone,
    );

    if (!next.isSame(current, 'minute')) {
      onChange(next.toDate());
    }
  };

  const discardDateDraft = () => {
    setDateDraft(null);
    setDateError(null);
  };

  const commitDate = (selected: Date | undefined) => {
    if (!selected) {
      return;
    }

    setCalendarOpen(false);
    discardDateDraft();
    // Read back the same way `siteCalendarDay` writes: local fields carry the
    // site-timezone day.
    commitDay(moment(selected).format(DATE_FORMAT));
  };

  const commitTypedDate = () => {
    if (dateDraft === null) {
      return;
    }

    const error = dateDraft ? typedDateError(dateDraft, timezone) : null;
    if (error) {
      setDateError(error);
      return;
    }

    discardDateDraft();
    // An emptied field falls back to the date already held.
    if (dateDraft) {
      commitDay(dateDraft);
    }
  };

  const onDateKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      setCalendarOpen(false);
      commitTypedDate();
      return;
    }

    if (event.key === 'Escape') {
      discardDateDraft();
      return;
    }

    const refusal = dateDraft ? typedDateError(dateDraft, timezone) : null;
    if (refusal && isSaveChord(event)) {
      // Keeps the document-level save shortcut from saving past a refused date.
      event.preventDefault();
      event.stopPropagation();
      setDateError(refusal);
    }
  };

  const commitTime = () => {
    if (timeDraft === null) {
      return;
    }

    const time = timeDraft ? typedTime(timeDraft) : null;
    if (timeDraft && !time) {
      setTimeError(INVALID_TIME);
      return;
    }

    setTimeDraft(null);
    setTimeError(null);
    // An emptied field falls back to the time already held.
    if (time && (time.hour !== current.hour() || time.minute !== current.minute())) {
      onChange(
        current
          .clone()
          .set({ ...time, second: 0, millisecond: 0 })
          .toDate(),
      );
    }
  };

  const onTimeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (timeDraft && !typedTime(timeDraft) && isSaveChord(event)) {
      // Keeps the document-level save shortcut from saving past a refused time.
      event.preventDefault();
      event.stopPropagation();
      setTimeError(INVALID_TIME);
    }
  };

  const dateDescribedBy = [describedBy, dateError ? dateErrorId : null].filter(Boolean).join(' ');
  const timeDescribedBy = [describedBy, timeError ? timeErrorId : null].filter(Boolean).join(' ');

  return (
    <>
      <Grid
        aria-labelledby={labelledBy}
        className={className}
        columns={2}
        gap="sm"
        role={labelledBy ? 'group' : undefined}
      >
        <Popover
          open={calendarOpen && !disabled}
          onOpenChange={(open) => {
            if (open) {
              interactedOutside.current = false;
            }
            setCalendarOpen(open);
          }}
        >
          <PopoverAnchor ref={anchorRef} className="min-w-0">
            <InputGroup className="min-w-0" data-disabled={disabled}>
              <InputGroupAddon>
                <PopoverTrigger asChild>
                  <InputGroupButton
                    aria-label="Choose date"
                    // Spaces the icon as the time field's timezone is spaced.
                    className="-mr-1 ml-1"
                    disabled={disabled}
                    size="icon-xs"
                    onClick={() => setCalendarFrom('button')}
                  >
                    <LucideIcon.CalendarDays aria-hidden="true" />
                  </InputGroupButton>
                </PopoverTrigger>
              </InputGroupAddon>
              <InputGroupInput
                ref={dateInputRef}
                aria-describedby={dateDescribedBy || undefined}
                aria-invalid={invalid || dateError !== null || undefined}
                aria-label={dateLabel}
                autoComplete="off"
                className="min-w-0"
                data-testid={dateTestId}
                disabled={disabled}
                placeholder={DATE_FORMAT}
                value={dateDraft ?? current.format(DATE_FORMAT)}
                onBlur={commitTypedDate}
                onChange={(event) => {
                  setDateDraft(event.target.value);
                  setCalendarOpen(false);
                }}
                onClick={() => {
                  setCalendarFrom('field');
                  if (!calendarOpen) {
                    interactedOutside.current = false;
                    setCalendarOpen(true);
                  }
                }}
                onKeyDown={onDateKeyDown}
              />
            </InputGroup>
          </PopoverAnchor>
          <PopoverContent
            aria-label="Choose date"
            className="w-auto p-0"
            onCloseAutoFocus={(event) => {
              const input = dateInputRef.current;
              // Radix would refocus the button, taking focus from the field that opened
              // the calendar or still holds it.
              if (calendarFrom === 'field' || document.activeElement === input) {
                event.preventDefault();
                if (!interactedOutside.current) {
                  input?.focus();
                }
              }
            }}
            onInteractOutside={(event) => {
              // The field and its button sit outside the calendar but must not dismiss it.
              if (anchorRef.current?.contains(event.target as Node)) {
                event.preventDefault();
                return;
              }
              interactedOutside.current = true;
            }}
            onOpenAutoFocus={(event) => {
              if (calendarFrom === 'field') {
                event.preventDefault();
                return;
              }
              // A containing modal's focus trap undoes the calendar's own autofocus, which runs first.
              const day = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(
                '[role="grid"] [tabindex="0"]',
              );
              if (day) {
                event.preventDefault();
                day.focus();
              }
            }}
          >
            <Calendar
              autoFocus={calendarFrom === 'button'}
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
        <InputGroup className="min-w-0" data-disabled={disabled}>
          <InputGroupAddon className="text-sm font-normal">{current.format('z')}</InputGroupAddon>
          <InputGroupInput
            aria-describedby={timeDescribedBy || undefined}
            aria-invalid={invalid || timeError !== null || undefined}
            aria-label={timeLabel}
            autoComplete="off"
            className="min-w-0"
            data-testid={timeTestId}
            disabled={disabled}
            placeholder={TIME_FORMAT}
            value={timeDraft ?? current.format(TIME_FORMAT)}
            onBlur={commitTime}
            onChange={(event) => setTimeDraft(event.target.value)}
            onKeyDown={onTimeKeyDown}
          />
        </InputGroup>
      </Grid>
      {dateError ? (
        <FieldError className={errorClassName} id={dateErrorId}>
          {dateError}
        </FieldError>
      ) : null}
      {timeError ? (
        <FieldError className={errorClassName} id={timeErrorId}>
          {timeError}
        </FieldError>
      ) : null}
    </>
  );
}
