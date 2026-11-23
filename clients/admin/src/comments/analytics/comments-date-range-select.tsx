import React, { useId, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectValue,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { PageHeader } from '@tryghost/shade/patterns';
import { LucideIcon, formatDisplayDate } from '@tryghost/shade/utils';
import { STATS_RANGES, STATS_RANGE_OPTIONS } from '@/shared/analytics/constants';
import { getTodayInTimezone } from '@/shared/filters';
import {
  CUSTOM_COMMENTS_RANGE,
  type CommentsCustomRange,
  getCommentsStatsSearchParams,
  parseCommentsCustomRange,
} from './comments-analytics-helpers';

interface CommentsDateRangeSelectProps {
  range: number;
  customRange?: CommentsCustomRange;
  timezone: string;
  onRangeChange: (range: number) => void;
  onCustomRangeChange: (range: CommentsCustomRange) => void;
}

const CommentsDateRangeSelect: React.FC<CommentsDateRangeSelectProps> = ({
  range,
  customRange,
  timezone,
  onRangeChange,
  onCustomRangeChange,
}) => {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const today = getTodayInTimezone(timezone);
  const parsedRange = parseCommentsCustomRange(from, to, timezone);
  const invalidRange = Boolean(from && to && !parsedRange);

  const openCustomRange = () => {
    const current = getCommentsStatsSearchParams(
      range === CUSTOM_COMMENTS_RANGE || range === STATS_RANGES.allTime.value ? 30 : range,
      timezone,
    );
    setFrom(customRange?.from ?? current.date_from ?? today);
    setTo(customRange?.to ?? current.date_to);
    setSelectOpen(false);
    setOpen(true);
  };

  return (
    <>
      <Select
        open={selectOpen}
        value={range === CUSTOM_COMMENTS_RANGE ? 'custom' : String(range)}
        onOpenChange={setSelectOpen}
        onValueChange={(value) => {
          if (value === 'custom') {
            openCustomRange();
          } else {
            onRangeChange(Number(value));
          }
        }}
      >
        <PageHeader.SelectTrigger ref={triggerRef} label="Date range" tooltip={false}>
          <LucideIcon.Calendar />
          <SelectValue>
            {customRange ? (
              <>
                <span className="sm:hidden">Custom range</span>
                <span className="hidden sm:inline">
                  {formatDisplayDate(customRange.from)} – {formatDisplayDate(customRange.to)}
                </span>
              </>
            ) : undefined}
          </SelectValue>
        </PageHeader.SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectLabel>Period</SelectLabel>
            {STATS_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.name}
              </SelectItem>
            ))}
            <SelectItem
              value="custom"
              onKeyDown={(event) => {
                if (range === CUSTOM_COMMENTS_RANGE && ['Enter', ' '].includes(event.key)) {
                  event.preventDefault();
                  openCustomRange();
                }
              }}
              onPointerUp={() => range === CUSTOM_COMMENTS_RANGE && openCustomRange()}
            >
              Custom range
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Custom date range</DialogTitle>
            <DialogDescription>Show comments written within this date range.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (parsedRange) {
                onCustomRangeChange(parsedRange);
                setOpen(false);
              }
            }}
          >
            <Stack gap="xl">
              <Stack gap="lg">
                <Stack gap="sm">
                  <Label htmlFor={`${id}-from`}>Start date</Label>
                  <Input
                    id={`${id}-from`}
                    max={to || today}
                    type="date"
                    value={from}
                    required
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </Stack>
                <Stack gap="sm">
                  <Label htmlFor={`${id}-to`}>End date</Label>
                  <Input
                    id={`${id}-to`}
                    max={today}
                    min={from}
                    type="date"
                    value={to}
                    required
                    onChange={(event) => setTo(event.target.value)}
                  />
                </Stack>
                {invalidRange && (
                  <Text role="alert" size="sm" tone="secondary">
                    {from > to
                      ? 'Start date must be on or before end date.'
                      : to > today
                        ? 'End date must be today or earlier.'
                        : 'Choose a shorter date range.'}
                  </Text>
                )}
              </Stack>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={!parsedRange} type="submit">
                  Apply
                </Button>
              </DialogFooter>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommentsDateRangeSelect;
