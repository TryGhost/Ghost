import {
  Button,
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useState } from 'react';
import { CONTENT_FIELD_GROUPS, CONTENT_FIELD_MAPPINGS } from './mapping';

interface FieldPickerProps {
  column: string;
  value: string | null;
  disabled: boolean;
  onValueChange: (value: string | null) => void;
}

export function FieldPicker({ column, value, disabled, onValueChange }: FieldPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = CONTENT_FIELD_MAPPINGS.find((field) => field.value === value);

  const choose = (target: string | null) => {
    onValueChange(target);
    setOpen(false);
  };

  return (
    <Popover open={open} modal onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Field for ${column}, ${selected?.label ?? 'not imported'}`}
          className={cn(
            'h-8 w-full justify-start gap-2 px-2 font-normal',
            !selected && 'text-muted-foreground',
          )}
          disabled={disabled}
          role="combobox"
          variant="outline"
        >
          <span className="min-w-0 flex-1 truncate text-left text-sm">
            {selected
              ? `${selected.label}${selected.required ? ' (required)' : ''}`
              : 'Not imported'}
          </span>
          <LucideIcon.ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        collisionPadding={16}
      >
        <Command>
          <CommandInput placeholder="Search post fields..." />
          <CommandList>
            <CommandEmpty>No post fields found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="Not imported" onSelect={() => choose(null)}>
                <LucideIcon.Ban />
                <span>Not imported</span>
                {!value && <CommandCheck />}
              </CommandItem>
            </CommandGroup>
            {CONTENT_FIELD_GROUPS.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.fields.map((field) => (
                  <CommandItem
                    key={field.value}
                    keywords={[field.label]}
                    value={field.value}
                    onSelect={() => choose(field.value)}
                  >
                    <span>
                      {field.label}
                      {field.required ? ' (required)' : ''}
                    </span>
                    {value === field.value && <CommandCheck />}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
