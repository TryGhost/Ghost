import React, { useEffect, useRef, useState } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// NY-1715 concepts: a muted pen button beside a card that differs from the last save; clicking
// it explains what the pen means.
const ModifiedDot: React.FC<{ className?: string }> = ({ className }) => {
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
