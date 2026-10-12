import React from 'react';
import {
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryghost/shade/components';

export interface IconToggleOption<Value extends string> {
  value: Value;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

/** A single-choice group of icon buttons, each named by its label and a tooltip. */
function IconToggleGroup<Value extends string>({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: Value;
  options: IconToggleOption<Value>[];
  onValueChange: (value: Value) => void;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        const option = options.find((candidate) => candidate.value === nextValue);
        if (option) {
          onValueChange(option.value);
        }
      }}
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
}

export default IconToggleGroup;
