import React from 'react';
import { Button } from '@tryghost/shade/components';
import { CAPS_LABEL } from './type';
import { cn } from '@tryghost/shade/utils';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Shared pieces for Exploration 1's Top content and Top sources.
//
// VisitorsHeader: the right of a list's title row, the number column's
// label. It stays put on hover.

export const VisitorsHeader: React.FC = () => <div className={CAPS_LABEL}>Visitors</div>;

// ViewAllLink: the list's "View all", a plain text link at the bottom left,
// always shown. For a SheetTrigger's asChild.
export const ViewAllLink = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    className={cn('h-auto p-0 font-medium text-foreground', className)}
    type="button"
    variant="link"
    {...props}
  >
    View all
  </Button>
));
ViewAllLink.displayName = 'ViewAllLink';
