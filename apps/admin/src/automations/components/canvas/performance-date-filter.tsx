import React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import {
  PERFORMANCE_RANGES,
  type PerformanceRange,
} from '@/automations/utils/performance-date-range';

export const PerformanceDateFilter: React.FC<{
  value: PerformanceRange;
  onChange: (value: PerformanceRange) => void;
}> = ({ value, onChange }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button aria-label="Filter performance" size="icon" type="button" variant="ghost">
        <LucideIcon.Funnel strokeWidth={2} />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>Entries</DropdownMenuLabel>
      {PERFORMANCE_RANGES.map((option) => (
        <DropdownMenuItem
          key={option.value}
          aria-checked={value === option.value}
          role="menuitemradio"
          onSelect={() => onChange(option.value)}
        >
          {option.label}
          <LucideIcon.Check
            aria-hidden="true"
            className={cn(
              'ms-auto text-primary',
              value === option.value ? 'opacity-100' : 'opacity-0',
            )}
          />
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);
