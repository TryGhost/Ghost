import React from 'react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { CAPS_LABEL } from './type';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Shared pieces for Exploration 1's Top content and Top sources.
//
// VisitorsHeader: the right of a list's title row, the number column's
// label. It stays put on hover.

export const VisitorsHeader: React.FC = () => <div className={CAPS_LABEL}>Visitors</div>;

// ViewAllButton: the list's "View all", a muted up-right arrow right after
// its title, named in a tooltip. It opens the list's full sheet (onClick).
export const ViewAllButton: React.FC<{ onClick: () => void; className?: string }> = ({
  onClick,
  className,
}) => (
  <TooltipProvider delayDuration={0}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label="View all"
          className={cn(
            'text-muted-foreground hover:text-foreground [&_svg]:size-4 [&_svg]:stroke-[1.5px]',
            className,
          )}
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onClick}
        >
          <LucideIcon.ArrowUpRight />
        </Button>
      </TooltipTrigger>
      <TooltipContent>View all</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
