import React from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';

export const AutomationCardWarning: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) {
    return null;
  }
  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button aria-label="Why this step needs attention" size="icon" variant="ghost">
          <LucideIcon.TriangleAlert className="text-state-warning" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72" updatePositionStrategy="always">
        <Text size="md">{message}</Text>
      </PopoverContent>
    </Popover>
  );
};
