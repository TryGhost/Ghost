import React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import type { NodeContextMenuEntry } from './nodes';

export const AutomationCardMenu: React.FC<{ label: string; menuItems: NodeContextMenuEntry[] }> = ({
  label,
  menuItems,
}) => (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <Button aria-label={label} size="icon" variant="ghost">
        <LucideIcon.Ellipsis className="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      updatePositionStrategy="always"
      onClick={(event) => event.stopPropagation()}
    >
      {menuItems.map((item) =>
        item.type === 'separator' ? (
          <DropdownMenuSeparator key={item.id} />
        ) : (
          <DropdownMenuItem
            key={item.label}
            className={
              item.variant === 'destructive' ? 'text-destructive focus:text-destructive' : undefined
            }
            onSelect={item.onSelect}
          >
            {item.icon && <item.icon className="size-4" />}
            {item.label}
          </DropdownMenuItem>
        ),
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);
