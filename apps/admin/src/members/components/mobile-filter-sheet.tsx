import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@tryghost/shade/components';
import { createPortal } from 'react-dom';
import { PageHeader } from '@tryghost/shade/patterns';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';

interface MobileFilterSheetProps {
  count: number;
  chips: { id: string; icon?: ReactNode; label: string; description: string }[];
  barContainer?: HTMLElement | null;
  backButtonRef?: Ref<HTMLSpanElement>;
  children: ReactNode;
  onClear: () => void;
}

export function MobileFilterSheet({
  count,
  chips,
  children,
  onClear,
  backButtonRef,
  barContainer,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
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
    scroller.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', update);
    };
  }, [chips, barContainer]);

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
        barContainer &&
        createPortal(
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
                  {chips.map((chip) => (
                    <Badge key={chip.id} size="md" variant="outline" asChild>
                      <span
                        className="shrink-0 gap-1.5 bg-background whitespace-nowrap"
                        title={chip.description}
                      >
                        <span className="sr-only">{chip.description}</span>
                        <span
                          aria-hidden="true"
                          className="flex items-center gap-1.5 [&_svg]:size-3.5"
                        >
                          {chip.icon}
                          {chip.label}
                        </span>
                      </span>
                    </Badge>
                  ))}
                </span>
              </button>
            </SheetTrigger>
            {count > 0 && (
              <Button className="shrink-0" variant="ghost" onClick={onClear}>
                Clear
              </Button>
            )}
          </Inline>,
          barContainer,
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
