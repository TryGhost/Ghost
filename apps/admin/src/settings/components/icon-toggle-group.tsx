import React from 'react';
import {
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryghost/shade/components';

export interface IconToggleOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

const IconToggleGroup: React.FC<{
  label: string;
  value: string;
  options: IconToggleOption[];
  onValueChange: (value: string) => void;
}> = ({ label, value, options, onValueChange }) => (
  <ToggleGroup
    aria-label={label}
    type="single"
    value={value}
    onValueChange={(nextValue) => nextValue && onValueChange(nextValue)}
  >
    {options.map((option) => (
      <Tooltip key={option.value}>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            aria-label={option.label}
            disabled={option.disabled}
            value={option.value}
          >
            {option.icon}
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>{option.label}</TooltipContent>
      </Tooltip>
    ))}
  </ToggleGroup>
);

export default IconToggleGroup;
