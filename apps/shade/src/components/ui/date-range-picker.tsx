import * as React from 'react';
import { type DateRange as DayPickerRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar } from '@/components/ui/calendar';
import { Kbd } from '@/components/ui/kbd';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** A complete range of calendar days, both ends included. */
export interface DateRangePickerRange {
  from: Date;
  to: Date;
}

export interface DateRangePickerPreset {
  id: string;
  label: string;
  /** The days it covers, highlighted on the calendar while it's selected. */
  range: DateRangePickerRange;
  /** A single key shown beside the preset. The consumer binds it. */
  shortcut?: string;
}

const DateRangePickerContext = React.createContext<{ open: boolean; close: () => void } | null>(
  null,
);

type DateRangePickerProps = React.ComponentProps<typeof Popover>;

/**
 * A popover that picks a date range: presets apply in one click, and two
 * clicks on the calendar pick any range in between.
 */
function DateRangePicker({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: DateRangePickerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );
  const context = React.useMemo(() => ({ open, close: () => setOpen(false) }), [open, setOpen]);

  return (
    <DateRangePickerContext.Provider value={context}>
      <Popover open={open} onOpenChange={setOpen} {...props} />
    </DateRangePickerContext.Provider>
  );
}

const DateRangePickerTrigger = PopoverTrigger;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dayCount = (range: DateRangePickerRange) =>
  Math.round(
    (Date.UTC(range.to.getFullYear(), range.to.getMonth(), range.to.getDate()) -
      Date.UTC(range.from.getFullYear(), range.from.getMonth(), range.from.getDate())) /
      86_400_000,
  ) + 1;

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

interface DateRangePickerContentProps extends Omit<
  React.ComponentPropsWithoutRef<typeof PopoverContent>,
  'children'
> {
  presets: DateRangePickerPreset[];
  /** The preset in use, if the range came from one. */
  activePresetId?: string;
  /** The range in use, shown on the calendar when it opens. */
  value?: DateRangePickerRange;
  onPresetSelect: (preset: DateRangePickerPreset) => void;
  onRangeSelect: (range: DateRangePickerRange) => void;
  /** The first and last days that can be picked. */
  minDate?: Date;
  maxDate?: Date;
  /** The fewest days a picked range can cover. */
  minDays?: number;
}

const DateRangePickerContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  DateRangePickerContentProps
>(
  (
    {
      className,
      presets,
      activePresetId,
      value,
      onPresetSelect,
      onRangeSelect,
      minDate,
      maxDate,
      minDays = 1,
      align = 'end',
      ...props
    },
    ref,
  ) => {
    const context = React.useContext(DateRangePickerContext);
    const isMobile = useIsMobile();
    // The first click of a new range
    const [draft, setDraft] = React.useState<DayPickerRange | undefined>(undefined);
    // Kept as a timestamp so hovering the same day again doesn't re-render
    const [hoveredDay, setHoveredDay] = React.useState<number | undefined>(undefined);

    // A range left half-picked is forgotten when the picker closes
    const open = context?.open;
    React.useEffect(() => {
      if (!open) {
        setDraft(undefined);
        setHoveredDay(undefined);
      }
    }, [open]);

    const close = () => context?.close();
    const selectPreset = (preset: DateRangePickerPreset) => {
      onPresetSelect(preset);
      close();
    };

    const handleSelect = (next: DayPickerRange | undefined) => {
      if (next?.from && next.to && dayCount({ from: next.from, to: next.to }) >= minDays) {
        onRangeSelect({ from: next.from, to: next.to });
        close();
        return;
      }
      setDraft(next);
    };

    const lastDay = maxDate ?? new Date();
    // One month when everything that can be picked fits in it
    const numberOfMonths =
      isMobile ||
      (minDate &&
        minDate.getFullYear() * 12 + minDate.getMonth() >=
          lastDay.getFullYear() * 12 + lastDay.getMonth())
        ? 1
        : 2;
    // Open on the months leading up to the range's end
    const shownEnd = value?.to ?? lastDay;
    const defaultMonth = startOfMonth(
      new Date(shownEnd.getFullYear(), shownEnd.getMonth() - (numberOfMonths - 1), 1),
    );

    // Once a start is picked, shade the days up to the one under the pointer
    const hoveredDate = hoveredDay === undefined ? undefined : new Date(hoveredDay);
    const previewRange =
      draft?.from && !draft.to && hoveredDate && !sameDay(hoveredDate, draft.from)
        ? hoveredDate < draft.from
          ? { from: hoveredDate, to: draft.from }
          : { from: draft.from, to: hoveredDate }
        : undefined;

    return (
      <PopoverContent
        ref={ref}
        align={align}
        className={cn('flex w-auto flex-col overflow-hidden p-0 sm:flex-row-reverse', className)}
        collisionPadding={16}
        data-slot="date-range-picker"
        {...props}
      >
        <div
          aria-label="Presets"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-border-default p-2 sm:w-48 sm:flex-col sm:overflow-x-visible sm:border-b-0 sm:border-l"
          role="listbox"
        >
          {presets.map((preset) => {
            const active = preset.id === activePresetId;
            return (
              <div
                key={preset.id}
                aria-keyshortcuts={preset.shortcut}
                aria-selected={active}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap text-foreground outline-none select-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  active && 'bg-accent font-medium',
                )}
                data-active={active}
                role="option"
                tabIndex={0}
                onClick={() => selectPreset(preset)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectPreset(preset);
                  }
                }}
              >
                {preset.label}
                {preset.shortcut && (
                  <Kbd aria-hidden="true" className="hidden sm:inline-flex">
                    {preset.shortcut.toUpperCase()}
                  </Kbd>
                )}
              </div>
            );
          })}
        </div>
        <div onMouseLeave={() => setHoveredDay(undefined)}>
          <Calendar
            // Month and year dropdowns, so earlier years are one pick away
            captionLayout="dropdown"
            className={cn(
              // Arrows that lead nowhere are hidden rather than disabled
              String.raw`[&_.rdp-button\_next[aria-disabled=true]]:invisible [&_.rdp-button\_previous[aria-disabled=true]]:invisible`,
              // Days are rounded squares, hovered or picked, like the ends of a
              // range; a range's own rounding still applies to its days
              '[&_td_button]:rounded-md',
            )}
            defaultMonth={defaultMonth}
            disabled={[...(minDate ? [{ before: minDate }] : []), { after: lastDay }]}
            endMonth={lastDay}
            min={minDays - 1}
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
            selected={draft ?? value}
            // Side-by-side months would otherwise show the days where they
            // meet twice
            showOutsideDays={false}
            startMonth={minDate}
            // A click after a complete range starts a new one
            resetOnSelect
            onDayMouseEnter={(day, modifiers) => {
              setHoveredDay(modifiers.disabled ? undefined : day.getTime());
            }}
            onSelect={handleSelect}
          />
        </div>
      </PopoverContent>
    );
  },
);
DateRangePickerContent.displayName = 'DateRangePickerContent';

export { DateRangePicker, DateRangePickerTrigger, DateRangePickerContent };
