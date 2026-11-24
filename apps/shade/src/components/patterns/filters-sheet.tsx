import { type FiltersProps } from '@/components/patterns/filters';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components';
import { createPortal } from 'react-dom';
import { PageHeader } from '@/components/patterns/page-header';
import { Inline, Stack } from '@/components/primitives';
import { LucideIcon, formatNumber, cn } from '@/utils';

interface FilterSheetSurfaceProps {
  count: number;
  keyboardShortcut?: string;
  chips: ReactNode[];
  barContainer?: HTMLElement | null;
  backButtonRef?: Ref<HTMLSpanElement>;
  children: ReactNode;
  onClear: () => void;
}

function FilterSheetSurface({
  count,
  keyboardShortcut,
  chips,
  children,
  onClear,
  backButtonRef,
  barContainer,
}: FilterSheetSurfaceProps) {
  const [open, setOpen] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  useEffect(() => {
    if (!keyboardShortcut) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.matches('input, textarea') || target.isContentEditable)
      ) {
        return;
      }
      if (
        event.key.toLowerCase() === keyboardShortcut.toLowerCase() &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcut]);

  const chipScroller = useRef<HTMLSpanElement>(null);
  const pointerStart = useRef<number | null>(null);
  const swiped = useRef(false);
  const [moreChips, setMoreChips] = useState(false);
  const [previousChips, setPreviousChips] = useState(false);

  useEffect(() => {
    const scroller = chipScroller.current;
    if (!scroller) {
      return;
    }
    const update = () => {
      setPreviousChips(scroller.scrollLeft > 1);
      setMoreChips(scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    Array.from(scroller.children).forEach((chip) => observer.observe(chip));
    scroller.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', update);
    };
  }, [chips, barContainer]);

  const renderBar = (bar: ReactNode) => (barContainer ? createPortal(bar, barContainer) : bar);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setKeyboardNavigation(false);
      }}
    >
      <SheetTrigger asChild>
        <PageHeader.Action
          label={count ? `Filters, ${formatNumber(count)} active` : 'Filters'}
          iconOnly
        >
          <LucideIcon.ListFilter />
        </PageHeader.Action>
      </SheetTrigger>
      {count > 0 &&
        renderBar(
          <Inline
            className="w-full rounded-control bg-filter-bar-background p-2"
            gap="sm"
            justify="between"
          >
            <SheetTrigger asChild>
              <button
                aria-label="Edit active filters"
                className="-my-2 -ml-2 min-w-0 flex-1 self-stretch rounded-control py-2 pl-2 text-left focus-visible:outline-2 focus-visible:outline-focus-ring"
                type="button"
                onClick={(event) => {
                  if (event.detail > 0 && swiped.current) {
                    event.preventDefault();
                  }
                }}
                onPointerCancel={() => {
                  pointerStart.current = null;
                  swiped.current = true;
                }}
                onPointerDown={(event) => {
                  pointerStart.current = event.clientX;
                  swiped.current = false;
                }}
                onPointerMove={(event) => {
                  if (
                    pointerStart.current !== null &&
                    Math.abs(event.clientX - pointerStart.current) > 8
                  ) {
                    swiped.current = true;
                  }
                }}
                onPointerUp={() => {
                  pointerStart.current = null;
                }}
              >
                <span
                  ref={chipScroller}
                  className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain p-1"
                  style={{
                    maskImage:
                      previousChips || moreChips
                        ? `linear-gradient(to right, ${previousChips ? 'transparent, black 24px' : 'black'}, ${moreChips ? 'black calc(100% - 24px), transparent' : 'black'})`
                        : undefined,
                  }}
                >
                  {chips}
                </span>
              </button>
            </SheetTrigger>
            {count > 0 && (
              <Button className="shrink-0" variant="ghost" onClick={onClear}>
                Clear
              </Button>
            )}
          </Inline>,
        )}
      <SheetContent
        aria-describedby={undefined}
        className="flex max-h-[85dvh] flex-col [&_[cmdk-item][data-selected=true]]:bg-transparent data-[keyboard-navigation=true]:[&_[cmdk-item][data-selected=true]]:bg-interactive-hover"
        data-keyboard-navigation={keyboardNavigation}
        side="bottom"
        onInputCapture={(event) => {
          if (event.target instanceof HTMLElement && event.target.matches('[cmdk-input]')) {
            setKeyboardNavigation(false);
          }
        }}
        onKeyDownCapture={(event) => {
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            setKeyboardNavigation(true);
          }
        }}
        onPointerDownCapture={() => {
          setKeyboardNavigation(false);
        }}
        onPointerMoveCapture={() => setKeyboardNavigation(false)}
      >
        <Inline className="shrink-0 pr-6" gap="sm">
          <span ref={backButtonRef} className="empty:hidden" />
          <SheetTitle>Filters</SheetTitle>
        </Inline>
        <Stack
          className="no-scrollbar -m-1 min-h-0 overflow-y-auto overscroll-contain p-1"
          gap="lg"
        >
          {children}
        </Stack>
      </SheetContent>
    </Sheet>
  );
}

export interface SheetFiltersProps<T = unknown> extends Omit<
  FiltersProps<T>,
  | 'inlinePicker'
  | 'renderPickerBack'
  | 'showClearButton'
  | 'clearButton'
  | 'addButton'
  | 'popoverContentClassName'
> {
  chips: FilterSheetSurfaceProps['chips'];
  controls: (props: FiltersProps<T>) => ReactNode;
  barContainer?: HTMLElement | null;
}

export function SheetFilters<T = unknown>({
  chips,
  controls: Controls,
  barContainer,
  className,
  inlineActions,
  ...props
}: SheetFiltersProps<T>) {
  const [backButtonContainer, setBackButtonContainer] = useState<HTMLSpanElement | null>(null);
  return (
    <FilterSheetSurface
      backButtonRef={setBackButtonContainer}
      barContainer={barContainer}
      chips={chips}
      count={props.filters.length}
      keyboardShortcut={props.keyboardShortcut}
      onClear={() => (props.onClear ? props.onClear() : props.onChange([]))}
    >
      <Controls
        {...props}
        addButton={
          <Button
            className="shrink-0 px-0 [@media(hover:none)]:hover:bg-transparent"
            variant="ghost"
          >
            <LucideIcon.Plus /> Add filter
          </Button>
        }
        className={cn(
          'w-full flex-col items-stretch gap-3',
          '[&_[data-slot=filter-item]]:w-full [&_[data-slot=filter-item]]:min-w-0',
          '[&_[data-slot=filter-item]>:nth-last-child(2)]:min-w-0 [&_[data-slot=filter-item]>:nth-last-child(2)]:flex-1 [&_[data-slot=filter-item]>:nth-last-child(2)]:overflow-hidden',
          '[&_[data-slot=filter-item]_input]:min-w-0 [&_[data-slot=filters-input-wrapper]]:min-w-0 [&_[data-slot=filters-input-wrapper]]:flex-1',
          '[&_[cmdk-group-heading]]:px-0! [&_[cmdk-group]]:px-0 [&_[cmdk-input-wrapper]]:px-0 [&_[cmdk-item]]:px-0 [&_[data-slot=command-list]]:px-0',
          '[&_[cmdk-input]]:text-base [&_[cmdk-item]]:min-h-10 [&_[cmdk-root]]:h-auto [&_[data-slot=command-list]]:max-h-none',

          className,
        )}
        inlineActions={inlineActions}
        keyboardShortcut={undefined}
        popoverContentClassName="z-[80] w-[min(360px,calc(100vw-32px))] max-h-(--radix-popover-content-available-height) [&_[data-slot=command-list]]:max-h-[min(450px,50dvh)]"
        renderPickerBack={(onBack) =>
          backButtonContainer &&
          createPortal(
            <Button
              aria-label="Back"
              className="-my-3 -mr-2 -ml-3 size-11 p-0 hover:bg-transparent"
              variant="ghost"
              onClick={onBack}
            >
              <LucideIcon.ArrowLeft />
            </Button>,
            backButtonContainer,
          )
        }
        showClearButton={false}
        inlinePicker
      />
    </FilterSheetSurface>
  );
}
