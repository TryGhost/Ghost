import React, { useId } from 'react';
import { DropdownMenuItem } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { PINS_FULL_HINT } from '@/apps/lib/pins';

interface PinMenuItemProps {
  pinned: boolean;
  /** No room to pin another app. */
  full: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

/**
 * Pins an app to the sidebar, or unpins it, from a menu. When no more apps fit, the item
 * says why under its label. It stays focusable, so a keyboard or screen reader user reaches
 * that reason too; a disabled menu item is skipped.
 */
export const PinMenuItem: React.FC<PinMenuItemProps> = ({ pinned, full, onPinnedChange }) => {
  const reasonId = useId();
  const blocked = !pinned && full;
  const label = pinned ? 'Unpin from sidebar' : 'Pin to sidebar';

  return (
    <DropdownMenuItem
      aria-describedby={blocked ? reasonId : undefined}
      aria-disabled={blocked || undefined}
      className="aria-disabled:cursor-not-allowed aria-disabled:[&>svg]:opacity-50"
      // Typing to find an item matches its label, not the reason under it.
      textValue={label}
      onSelect={(event) => {
        if (blocked) {
          // Keeps the menu open on the reason rather than closing on nothing.
          event.preventDefault();
          return;
        }
        onPinnedChange(!pinned);
      }}
    >
      {pinned ? <LucideIcon.PinOff /> : <LucideIcon.Pin />}
      <span className="flex flex-col">
        <span className={blocked ? 'opacity-50' : undefined}>{label}</span>
        {blocked && (
          // Out of the name, which stays the action, and read as its description instead.
          <span aria-hidden="true" className="text-xs text-muted-foreground" id={reasonId}>
            {PINS_FULL_HINT}
          </span>
        )}
      </span>
    </DropdownMenuItem>
  );
};
