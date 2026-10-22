import React, { useEffect, useMemo } from 'react';
import moment from 'moment-timezone';
import { LucideIcon } from '@tryghost/shade/utils';
import { PageHeader } from '@tryghost/shade/patterns';
import { STATS_RANGES, STATS_RANGE_OPTIONS } from './constants';
import {
  DateRangePicker,
  DateRangePickerContent,
  type DateRangePickerPreset,
  type DateRangePickerRange,
  DateRangePickerTrigger,
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

// Single keys that pick a preset anywhere on the page, shown beside each one.
// Letters follow Plausible's where it has the same range; F stays the filter's
const PRESET_SHORTCUTS: Partial<Record<keyof typeof STATS_RANGES, string>> = {
  today: 'd',
  last7Days: 'w',
  last30Days: 't',
  last3Months: 'n',
  yearToDate: 'y',
  last12Months: 'l',
  allTime: 'a',
};

// The calendar shows plain calendar dates; ranges are days in the site's timezone
const toCalendarDate = (date: moment.Moment) => new Date(date.year(), date.month(), date.date());

const toCalendarRange = (range: StatsRange): DateRangePickerRange => {
  if (isCustomRange(range)) {
    return { from: moment(range.from).toDate(), to: moment(range.to).toDate() };
  }
  const { startDate, endDate } = getRangeDates(range);
  return { from: toCalendarDate(startDate), to: toCalendarDate(endDate) };
};

const toCustomRange = (range: DateRangePickerRange): CustomDateRange => ({
  from: formatQueryDate(moment(range.from)),
  to: formatQueryDate(moment(range.to)),
});

// Typing in a field, or a key with a modifier, isn't a shortcut
const isShortcutKey = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  return !(
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.isComposing ||
    event.defaultPrevented ||
    (target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable))
  );
};

type DateRangeSelectProps = {
  range: StatsRange;
  onRangeChange: (value: StatsRange) => void;
  excludeRanges?: (keyof typeof STATS_RANGES)[];
  // The first day a custom range can start, e.g. a post's publication date.
  // Never earlier than where All time starts.
  earliestDate?: Date;
};

const DateRangeSelect: React.FC<DateRangeSelectProps> = ({
  range,
  onRangeChange,
  excludeRanges = [],
  earliestDate: callerEarliestDate,
}) => {
  const excludeValues = excludeRanges.map((key) => STATS_RANGES[key].value);
  // Excluding Today also rules out single-day custom ranges: both chart
  // hourly visitor data
  const minCustomDays = excludeRanges.includes('today') ? 2 : 1;

  const presets = useMemo(
    () =>
      (Object.keys(STATS_RANGES) as (keyof typeof STATS_RANGES)[])
        .filter((key) =>
          STATS_RANGE_OPTIONS.some((option) => option.value === STATS_RANGES[key].value),
        )
        .filter((key) => !excludeRanges.includes(key))
        .map((key): DateRangePickerPreset => ({
          id: String(STATS_RANGES[key].value),
          label: STATS_RANGES[key].name,
          range: toCalendarRange(STATS_RANGES[key].value),
          shortcut: PRESET_SHORTCUTS[key],
        })),
    // Ranges move with today, and All time with the site's history: worked
    // out afresh on each render, like the views' own ranges

    [excludeRanges.join(','), range],
  );

  const isExcluded = isCustomRange(range)
    ? getCustomRangeDays(range) < minCustomDays
    : excludeValues.includes(range);

  // If the current range is excluded, switch to a sensible fallback
  useEffect(() => {
    if (isExcluded && presets.length > 0) {
      // Prefer "Last 7 days" if available, otherwise use the first available option
      const preferred = presets.find(
        (preset) => preset.id === String(STATS_RANGES.last7Days.value),
      );
      onRangeChange(Number((preferred ?? presets[0]).id));
    }
  }, [isExcluded, presets, onRangeChange]);

  // Preset keys work anywhere on the page, like F for the filter
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isShortcutKey(event)) {
        return;
      }
      const preset = presets.find((p) => p.shortcut === event.key.toLowerCase());
      if (preset) {
        event.preventDefault();
        onRangeChange(Number(preset.id));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presets, onRangeChange]);

  // Custom ranges reach back exactly as far as All time does, or less when
  // the caller has a later start (a post can't have traffic before it was
  // published)
  const { startDate: allTimeStart, timezone } = getRangeDates(STATS_RANGES.allTime.value);
  const minDate = toCalendarDate(
    moment.max(
      allTimeStart,
      moment.tz(callerEarliestDate ?? allTimeStart, timezone).startOf('day'),
    ),
  );
  const maxDate = toCalendarDate(moment().tz(timezone));

  const label = isCustomRange(range)
    ? formatCustomRange(range)
    : (presets.find((preset) => preset.id === String(range))?.label ?? '');

  return (
    <DateRangePicker>
      <DateRangePickerTrigger asChild>
        <PageHeader.Action label="Date range" tooltip={false}>
          <LucideIcon.Calendar />
          {label}
        </PageHeader.Action>
      </DateRangePickerTrigger>
      <DateRangePickerContent
        activePresetId={isCustomRange(range) ? undefined : String(range)}
        aria-label="Date range"
        maxDate={maxDate}
        minDate={minDate}
        minDays={minCustomDays}
        presets={presets}
        value={toCalendarRange(range)}
        onPresetSelect={(preset) => onRangeChange(Number(preset.id))}
        onRangeSelect={(picked) => onRangeChange(toCustomRange(picked))}
      />
    </DateRangePicker>
  );
};

export default DateRangeSelect;
