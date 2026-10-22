import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Indicator,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { isCanvasCardV2, useConcept } from './concept';

// NY-1715 concepts: a muted pen button beside a card that differs from the last save; clicking
// it explains what the pen means. E (Canvas card v2) shows an "Unsaved" label instead —
// feedback was that a pen reads as an edit button, not as information.
const ModifiedDot: React.FC<{ className?: string }> = ({ className }) => {
  const concept = useConcept();
  if (isCanvasCardV2(concept)) {
    return <EditedLabel className={className} />;
  }
  return <PenMarker className={className} />;
};

// Not interactive, and hidden from screen readers: the card's own label says "modified".
// Beside a card the word shows on hover; beside the open editor it always shows.
export const EditedLabel: React.FC<{
  className?: string;
  showText?: boolean;
  style?: React.CSSProperties;
}> = ({ className, showText = false, style }) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex h-9 items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground',
      className,
    )}
    style={style}
  >
    <Indicator size="sm" state="active" variant="warning" />
    {/* The dot always shows; the word joins it while the card is hovered or focused. */}
    <span
      className={cn(
        !showText &&
          'opacity-0 transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 motion-reduce:transition-none',
      )}
    >
      Unsaved
    </span>
  </span>
);

const PenMarker: React.FC<{ className?: string }> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // The canvas (React Flow) swallows the pointer events Radix listens for to dismiss, so
  // clicks on it would leave the popover open. Watch in the capture phase instead.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !contentRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            aria-label="Unsaved changes"
            className={cn('text-muted-foreground', open && 'bg-muted')}
            size="icon"
            type="button"
            variant="ghost"
          >
            <LucideIcon.Pen className="size-3.5" strokeWidth={2} />
          </Button>
        </PopoverTrigger>
        <PopoverContent ref={contentRef} align="start" className="w-auto" side="right">
          <Text size="sm">This step has unsaved changes</Text>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ModifiedDot;
