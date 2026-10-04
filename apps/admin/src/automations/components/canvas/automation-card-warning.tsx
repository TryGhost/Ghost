import React, { useEffect, useRef, useState } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';

const CardWarningPopover: React.FC<{ message: string }> = ({ message }) => {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const dismissedOutside = useRef(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !trigger.current?.contains(event.target) &&
        !content.current?.contains(event.target)
      ) {
        dismissedOutside.current = true;
        setOpen(false);
      }
    };
    // React Flow consumes canvas mouse events before Radix can dismiss the popover.
    document.addEventListener('pointerdown', dismissOutside, true);
    return () => document.removeEventListener('pointerdown', dismissOutside, true);
  }, [open]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={trigger}
          aria-label="Why this step needs attention"
          size="icon"
          variant="ghost"
        >
          <LucideIcon.TriangleAlert className="text-state-warning" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={content}
        align="end"
        className="w-72"
        updatePositionStrategy="always"
        onCloseAutoFocus={(event) => {
          if (dismissedOutside.current) {
            event.preventDefault();
          }
          dismissedOutside.current = false;
        }}
      >
        <Text size="md">{message}</Text>
      </PopoverContent>
    </Popover>
  );
};

export const AutomationCardWarning: React.FC<{ message?: string }> = ({ message }) =>
  message ? <CardWarningPopover message={message} /> : null;
