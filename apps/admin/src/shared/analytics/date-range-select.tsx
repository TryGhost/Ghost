import React, { useEffect, useRef, useState } from 'react';
import moment from 'moment-timezone';
import { Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber, useIsMobile } from '@tryghost/shade/utils';
import { PageHeader } from '@tryghost/shade/patterns';
import { STATS_RANGES, STATS_RANGE_OPTIONS } from './constants';
import {
  Button,
  Calendar,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectValue,
} from '@tryghost/shade/components';
import {
  type CustomDateRange,
  type StatsRange,
  formatCustomRange,
  formatQueryDate,
  getCustomRangeDays,
  getRangeDates,
  isCustomRange,
} from './chart-helpers';

// "Custom range…" opens the calendar; an applied custom range is held under a
// separate value so picking "Custom range…" again still fires a change
const CUSTOM_RANGE_OPTION = 'custom';
const CUSTOM_RANGE_APPLIED = 'custom-applied';

type CalendarSelection = { from: Date | undefined; to?: Date | undefined } | undefined;

const toCalendarSelection = (range: CustomDateRange): CalendarSelection => ({
  from: moment(range.from).toDate(),
  to: moment(range.to).toDate(),
});

// A start date on its own is a single-day range
const toCustomRange = (selection: CalendarSelection): CustomDateRange | null => {
  if (!selection?.from) {
    return null;
  }
  return {
    from: formatQueryDate(moment(selection.from)),
    to: formatQueryDate(moment(selection.to ?? selection.from)),
  };
};

type DateRangeSelectProps = {
  excludeRanges?: (keyof typeof STATS_RANGES)[];
  // The first day a custom range can start, e.g. a post's publication date.
  // Never earlier than where All time starts.
  earliestDate?: Date;
} & (
  | {
      range: number;
      onRangeChange: (value: number) => void;
      allowCustomRange?: false;
    }
  | {
      range: StatsRange;
      onRangeChange: (value: StatsRange) => void;
      // Adds a "Custom range…" option that picks dates on a calendar
      allowCustomRange: true;
    }
);

const DateRangeSelect: React.FC<DateRangeSelectProps> = (props) => {
  const { range, excludeRanges = [] } = props;
  const isMobile = useIsMobile();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selection, setSelection] = useState<CalendarSelection>(undefined);
  // Kept as a timestamp so hovering the same day again doesn't re-render
  const [hoveredDay, setHoveredDay] = useState<number | undefined>(undefined);
  const openPickerOnSelectCloseRef = useRef(false);

  const excludeValues = excludeRanges.map((key) => STATS_RANGES[key].value);
  const filteredOptions = STATS_RANGE_OPTIONS.filter(
    (option) => !excludeValues.includes(option.value),
  );
  // Excluding Today also rules out single-day custom ranges: both chart
  // hourly visitor data
  const minCustomDays = excludeRanges.includes('today') ? 2 : 1;

  const isExcluded = isCustomRange(range)
    ? getCustomRangeDays(range) < minCustomDays
    : excludeValues.includes(range);

  // If the current range is excluded, switch to a sensible fallback
  useEffect(() => {
    if (isExcluded && filteredOptions.length > 0) {
      // Prefer "Last 7 days" if available, otherwise use the first available option
      const preferredFallback = filteredOptions.find(
        (option) => option.value === STATS_RANGES.last7Days.value,
      );
      const fallbackRange = preferredFallback ? preferredFallback.value : filteredOptions[0].value;
      props.onRangeChange(fallbackRange);
    }
  }, [isExcluded, filteredOptions, props]);

  const handleValueChange = (value: string) => {
    if (value === CUSTOM_RANGE_OPTION) {
      // Open the calendar once the select has closed, so returning focus to
      // the trigger doesn't count as a click outside the calendar
      openPickerOnSelectCloseRef.current = true;
      setSelection(isCustomRange(range) ? toCalendarSelection(range) : undefined);
      return;
    }
    props.onRangeChange(Number(value));
  };

  const handleSelectCloseAutoFocus = (event: Event) => {
    if (openPickerOnSelectCloseRef.current) {
      openPickerOnSelectCloseRef.current = false;
      event.preventDefault();
      setIsPickerOpen(true);
    }
  };

  const draftRange = toCustomRange(selection);
  const canApply = draftRange !== null && getCustomRangeDays(draftRange) >= minCustomDays;

  const handleApply = () => {
    if (props.allowCustomRange && draftRange && canApply) {
      props.onRangeChange(draftRange);
      setIsPickerOpen(false);
    }
  };

  // Custom ranges reach back exactly as far as All time does, or less when
  // the caller has a later start (a post can't have traffic before it was
  // published)
  const allTimeStart = getRangeDates(STATS_RANGES.allTime.value).startDate;
  const earliestDate = moment
    .max(allTimeStart, moment(props.earliestDate ?? allTimeStart).startOf('day'))
    .toDate();
  const today = new Date();
  // Two months need two months to show: one when everything allowed is in
  // this month
  const numberOfMonths = isMobile || moment(earliestDate).isSame(today, 'month') ? 1 : 2;
  // Open on the months leading up to the selected end date (or today)
  const defaultMonth = moment(selection?.to ?? selection?.from ?? new Date())
    .startOf('month')
    .subtract(numberOfMonths - 1, 'months')
    .toDate();

  // Once a start date is picked, shade the range up to the day under the
  // pointer until the end date is clicked
  const hoveredDate = hoveredDay === undefined ? undefined : new Date(hoveredDay);
  const previewRange =
    selection?.from &&
    !selection.to &&
    hoveredDate &&
    !moment(hoveredDate).isSame(selection.from, 'day')
      ? hoveredDate < selection.from
        ? { from: hoveredDate, to: selection.from }
        : { from: selection.from, to: hoveredDate }
      : undefined;

  let selectionSummary = 'Select a start date';
  if (draftRange) {
    const days = getCustomRangeDays(draftRange);
    selectionSummary =
      days < minCustomDays
        ? 'Select an end date'
        : `${formatCustomRange(draftRange)} · ${formatNumber(days)} ${days === 1 ? 'day' : 'days'}`;
  }

  return (
    <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
      <Select
        value={isCustomRange(range) ? CUSTOM_RANGE_APPLIED : String(range)}
        onValueChange={handleValueChange}
      >
        <PopoverAnchor asChild>
          <PageHeader.SelectTrigger label="Date range" tooltip={false}>
            <LucideIcon.Calendar className="mr-2" size={16} strokeWidth={1.5} />
            <SelectValue placeholder="Select a period">
              {isCustomRange(range) ? formatCustomRange(range) : undefined}
            </SelectValue>
          </PageHeader.SelectTrigger>
        </PopoverAnchor>
        <SelectContent align="end" onCloseAutoFocus={handleSelectCloseAutoFocus}>
          <SelectGroup>
            <SelectLabel>Period</SelectLabel>
            {filteredOptions.map((option) => (
              <SelectItem key={option.value} value={`${option.value}`}>
                {option.name}
              </SelectItem>
            ))}
          </SelectGroup>
          {props.allowCustomRange && (
            <>
              <SelectSeparator />
              <SelectItem value={CUSTOM_RANGE_OPTION}>Custom range…</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
      {props.allowCustomRange && (
        <PopoverContent
          align="end"
          aria-label="Custom date range"
          className="w-auto overflow-hidden p-0"
          collisionPadding={16}
        >
          <div onMouseLeave={() => setHoveredDay(undefined)}>
            <Calendar
              // Month and year dropdowns, so earlier years are one pick away
              // rather than a month-by-month walk back
              captionLayout="dropdown"
              // Hide the arrows at this month and at the earliest month,
              // rather than leaving disabled arrows that lead nowhere
              className={String.raw`[&_.rdp-button\_next[aria-disabled=true]]:invisible [&_.rdp-button\_previous[aria-disabled=true]]:invisible`}
              defaultMonth={defaultMonth}
              disabled={[{ before: earliestDate }, { after: today }]}
              endMonth={today}
              min={minCustomDays - 1}
              mode="range"
              modifiers={
                previewRange && {
                  preview: previewRange,
                  previewStart: previewRange.from,
                  previewEnd: previewRange.to,
                }
              }
              modifiersClassNames={{
                preview: 'bg-accent',
                previewStart: 'rounded-l-md',
                previewEnd: 'rounded-r-md',
              }}
              numberOfMonths={numberOfMonths}
              selected={selection}
              // Side-by-side months would otherwise show the days where they
              // meet twice, both highlighted when inside the range
              showOutsideDays={false}
              startMonth={earliestDate}
              resetOnSelect
              onDayMouseEnter={(day, modifiers) => {
                setHoveredDay(modifiers.disabled ? undefined : day.getTime());
              }}
              onSelect={setSelection}
            />
          </div>
          <Inline
            align="center"
            className="border-t border-border-default p-3"
            gap="md"
            justify="between"
          >
            <Text size="sm" tone="secondary">
              {selectionSummary}
            </Text>
            <Inline gap="sm">
              <Button size="sm" variant="ghost" onClick={() => setIsPickerOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!canApply} size="sm" onClick={handleApply}>
                Apply
              </Button>
            </Inline>
          </Inline>
        </PopoverContent>
      )}
    </Popover>
  );
};

export default DateRangeSelect;
