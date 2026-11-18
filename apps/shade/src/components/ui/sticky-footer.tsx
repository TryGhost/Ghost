import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StickyFooterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  shiftY?: string;
  height?: number;
  children?: ReactNode;
  contentClassName?: string;
}

// The element sticky positioning measures against. `hidden` makes one too;
// `clip` doesn't.
const isScrollContainer = (element: HTMLElement) => {
  const { overflowY } = getComputedStyle(element);
  return overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden';
};

/**
 * Keeps actions visible at the bottom of a scrolling surface.
 *
 * The footer takes its background from `--sticky-footer-background`, which
 * Shade's Dialog sets to its own surface; anywhere else it falls back to
 * `--background`. When the scroll container has bottom padding, the footer
 * fills it so content doesn't show beneath the footer.
 */
export const StickyFooter = ({
  shiftY,
  height = 96,
  children,
  className,
  contentClassName,
  style,
  ...props
}: StickyFooterProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const footer = ref.current;
    let container = footer?.parentElement ?? null;
    while (container && !isScrollContainer(container)) {
      container = container.parentElement;
    }
    if (!footer) {
      return;
    }
    if (!container || container === footer.ownerDocument.documentElement) {
      // The document scrolls. In a Ghost app, the window's bottom is under Admin's chrome, so the
      // footer sticks at the safe area's.
      footer.style.setProperty(
        '--sticky-footer-bottom',
        'var(--ghost-safe-area-inset-bottom, 0px)',
      );
    }
    if (!container) {
      return;
    }

    const scrollContainer = container;
    const update = () => {
      footer.style.setProperty(
        '--sticky-footer-inset',
        getComputedStyle(scrollContainer).paddingBottom,
      );
    };
    update();

    // Responsive padding follows the window or the container's size, and a
    // breakpoint can change the padding without resizing the content box.
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(scrollContainer);

    return () => {
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, []);

  const bottom = (offset: string) =>
    `calc(${shiftY ? `${shiftY} + ` : ''}${offset} + var(--sticky-footer-bottom, 0px))`;

  return (
    <div
      ref={ref}
      className={cn(
        'sticky z-[297] m-0 box-border w-full p-0 [--sticky-footer-bg:var(--sticky-footer-background,var(--background))]',
        className,
      )}
      style={{
        bottom: bottom('-24px'),
        height: `${height + 24}px`,
        ...style,
      }}
      {...props}
    >
      <div className="sticky bottom-0 z-[298] block h-6 bg-(--sticky-footer-bg)" />
      <div
        className={cn(
          'sticky bottom-[var(--sticky-footer-bottom,0px)] z-[299] -mb-6 flex items-center justify-between bg-(--sticky-footer-bg)',
          contentClassName,
        )}
        style={{ height }}
      >
        {children}
        {/* Fills the scroll container's bottom padding below the footer. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-full h-[var(--sticky-footer-inset,0px)] bg-(--sticky-footer-bg)"
        />
      </div>
      <div
        className="sticky mx-2 block h-6 rounded-full shadow-[0_0_0_1px_color-mix(in_oklab,var(--border)_25%,transparent),0_-8px_16px_-3px_color-mix(in_oklab,var(--foreground)_8%,transparent)]"
        style={{ bottom: bottom(`${height - 24}px`) }}
      />
    </div>
  );
};
