import * as React from 'react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  type ChevronProps,
  DayButton,
  DayPicker,
  type DropdownProps,
  type MonthCaptionProps,
  type RootProps,
  type WeekNumberProps,
  getDefaultClassNames,
  useDayPicker,
} from 'react-day-picker';

import { useShade } from '@/providers/shade-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';

// Months are compared and built as a single count (year * 12 + month) so
// stepping across years needs no special cases
const toMonthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();
const fromMonthIndex = (index: number) => new Date(Math.floor(index / 12), index % 12, 1);

// Which of the displayed months a caption belongs to, for its dropdowns
const CalendarMonthContext = React.createContext<{
  monthIndex: number;
  displayIndex: number;
} | null>(null);

function CalendarMonthCaption({ calendarMonth, displayIndex, ...props }: MonthCaptionProps) {
  return (
    <CalendarMonthContext.Provider
      value={{ monthIndex: toMonthIndex(calendarMonth.date), displayIndex }}
    >
      <div {...props} />
    </CalendarMonthContext.Provider>
  );
}

// DayPicker treats a change in any month's dropdown as choosing the FIRST
// displayed month, so with several months a pick in the second one moved it
// into the first slot, and picking the last allowed month pushed the months
// after it out of view. Keep the picked month in the slot it was picked in,
// and keep every displayed month inside startMonth and endMonth.
function CalendarCaptionDropdown({ unit, ...props }: DropdownProps & { unit: 'month' | 'year' }) {
  const { components, dayPickerProps, goToMonth } = useDayPicker();
  const position = React.useContext(CalendarMonthContext);
  if (!position) {
    // A caller replaced MonthCaption, so fall back to DayPicker's handling
    return <components.Dropdown {...props} />;
  }

  const { monthIndex, displayIndex } = position;
  const { startMonth, endMonth, numberOfMonths = 1 } = dayPickerProps;

  const minFirst = startMonth ? toMonthIndex(startMonth) : -Infinity;
  const maxFirst = endMonth ? toMonthIndex(endMonth) - (numberOfMonths - 1) : Infinity;
  const pickedMonth = (value: number) =>
    unit === 'month' ? Math.floor(monthIndex / 12) * 12 + value : value * 12 + (monthIndex % 12);
  const fitsInSlot = (month: number) =>
    month - displayIndex >= minFirst && month - displayIndex <= maxFirst;

  const options = props.options?.map((option) => {
    const fits =
      unit === 'month'
        ? fitsInSlot(pickedMonth(option.value))
        : Array.from({ length: 12 }, (_, month) => option.value * 12 + month).some(fitsInSlot);
    return { ...option, disabled: option.disabled || !fits };
  });

  return (
    <components.Dropdown
      {...props}
      options={options}
      onChange={(event) => {
        const first = pickedMonth(Number(event.target.value)) - displayIndex;
        goToMonth(fromMonthIndex(Math.min(Math.max(first, minFirst), maxFirst)));
      }}
    />
  );
}

// Custom components live at module level: defined inline, each Calendar render
// would hand DayPicker new component types and remount the whole calendar
function CalendarRoot({ className, rootRef, ...props }: RootProps) {
  return <div ref={rootRef} className={cn(className)} data-slot="calendar" {...props} />;
}

function CalendarChevron({ className, orientation, ...props }: ChevronProps) {
  if (orientation === 'left') {
    return <ChevronLeftIcon className={cn('size-4', className)} {...props} />;
  }
  if (orientation === 'right') {
    return <ChevronRightIcon className={cn('size-4', className)} {...props} />;
  }
  return <ChevronDownIcon className={cn('size-4', className)} {...props} />;
}

function CalendarWeekNumber({ children, ...props }: WeekNumberProps) {
  return (
    <td {...props}>
      <div className="flex size-(--cell-size) items-center justify-center text-center">
        {children}
      </div>
    </td>
  );
}

function CalendarMonthsDropdown(props: DropdownProps) {
  return <CalendarCaptionDropdown unit="month" {...props} />;
}

function CalendarYearsDropdown(props: DropdownProps) {
  return <CalendarCaptionDropdown unit="year" {...props} />;
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const { controlShape, isAdmin7 } = useShade();
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      captionLayout={captionLayout}
      className={cn(
        'group/calendar bg-background p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('relative flex flex-col gap-4 md:flex-row', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant, isAdmin7, shape: controlShape }),
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant, isAdmin7, shape: controlShape }),
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn('absolute inset-0 bg-popover opacity-0', defaultClassNames.dropdown),
        caption_label: cn(
          'font-medium select-none',
          captionLayout === 'label'
            ? 'text-sm'
            : 'flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground',
          defaultClassNames.caption_label,
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'w-(--cell-size) rounded-md text-sm font-normal text-muted-foreground select-none',
          defaultClassNames.weekday,
        ),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        week_number_header: cn('w-(--cell-size) select-none', defaultClassNames.week_number_header),
        week_number: cn(
          'text-[0.8rem] text-muted-foreground select-none',
          defaultClassNames.week_number,
        ),
        day: cn(
          // A range rounds off where it wraps onto the next week; a day picked
          // on its own keeps its full shape on any weekday
          'group/day relative aspect-square size-full p-0 text-center select-none [&:first-child[data-selected=true]_button[data-range-middle=true]]:rounded-l-md [&:last-child[data-selected=true]_button[data-range-middle=true]]:rounded-r-md',
          defaultClassNames.day,
        ),
        range_start: cn('rounded-l-md bg-accent', defaultClassNames.range_start),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md bg-accent', defaultClassNames.range_end),
        today: cn(
          'rounded-md bg-accent text-accent-foreground data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside,
        ),
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: CalendarRoot,
        Chevron: CalendarChevron,
        DayButton: CalendarDayButton,
        MonthCaption: CalendarMonthCaption,
        MonthsDropdown: CalendarMonthsDropdown,
        YearsDropdown: CalendarYearsDropdown,
        WeekNumber: CalendarWeekNumber,
        ...components,
      }}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      className={cn(
        'flex aspect-square size-auto w-full min-w-(--cell-size) flex-auto items-center justify-center gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-accent-foreground [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      data-day={day.date.toLocaleDateString()}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      size="icon"
      variant="ghost"
      {...props}
    />
  );
}
CalendarDayButton.displayName = 'CalendarDayButton';

export { Calendar, CalendarDayButton };
