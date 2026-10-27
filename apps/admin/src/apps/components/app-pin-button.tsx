import React from 'react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { PINS_FULL_MESSAGE } from '@/apps/lib/pins';

interface AppPinButtonProps {
  pinned: boolean;
  /** No room to pin another app. */
  full: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

/** Pins an app to the sidebar, or unpins it, from its own page. */
export const AppPinButton: React.FC<AppPinButtonProps> = ({ pinned, full, onPinnedChange }) => {
  const disabled = !pinned && full;
  const button = (
    <Button
      aria-disabled={disabled || undefined}
      className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      variant="outline"
      onClick={() => {
        if (!disabled) {
          onPinnedChange(!pinned);
        }
      }}
    >
      {pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
    </Button>
  );

  if (!disabled) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{PINS_FULL_MESSAGE}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
