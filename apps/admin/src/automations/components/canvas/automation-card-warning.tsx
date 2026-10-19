import React, { useState } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useDismissOnOutsidePress } from './use-dismiss-on-outside-press';

const CardWarningPopover: React.FC<{ message: string }> = ({ message }) => {
  const [open, setOpen] = useState(false);
  const { triggerRef, contentRef, onCloseAutoFocus } = useDismissOnOutsidePress(open, setOpen);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          aria-label="Why this step needs attention"
          size="icon"
          variant="ghost"
        >
          <LucideIcon.TriangleAlert className="text-state-warning" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="end"
        className="w-72"
        updatePositionStrategy="always"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <Text size="md">{message}</Text>
      </PopoverContent>
    </Popover>
  );
};

export const AutomationCardWarning: React.FC<{ message?: string }> = ({ message }) =>
  message ? <CardWarningPopover message={message} /> : null;
