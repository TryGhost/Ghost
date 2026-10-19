import { useCallback, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Button, InputGroup, InputGroupAddon, InputGroupInput } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';

export const MemberSearch = ({
  open,
  onOpenChange,
  onInputChange,
  onSearchChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInputChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}) => {
  const [input, setInput] = useState('');
  const button = useRef<HTMLButtonElement>(null);
  const focusInput = useCallback((element: HTMLInputElement | null) => {
    element?.focus();
  }, []);
  const debounce = useDebouncedCallback((value: string) => onSearchChange(value.trim()), 300);
  const close = () => {
    debounce.cancel();
    setInput('');
    onInputChange('');
    onSearchChange('');
    onOpenChange(false);
    requestAnimationFrame(() => button.current?.focus());
  };
  if (!open) {
    return (
      <Button
        ref={button}
        aria-label="Search members"
        className="ml-auto"
        size="icon"
        variant="ghost"
        onClick={() => onOpenChange(true)}
      >
        <LucideIcon.Search />
      </Button>
    );
  }
  return (
    <Inline className="min-w-0 flex-1" gap="sm">
      <InputGroup className="h-9 min-w-0 flex-1">
        <InputGroupAddon>
          <LucideIcon.Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          ref={focusInput}
          aria-label="Search members"
          placeholder="Search members…"
          value={input}
          onChange={(event) => {
            const value = event.target.value;
            setInput(value);
            onInputChange(value.trim());
            if (!value.trim()) {
              debounce.cancel();
              onSearchChange('');
            } else {
              debounce(value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
            if (event.key === 'Enter') {
              debounce.flush();
            }
          }}
        />
      </InputGroup>
      <Button aria-label="Close member search" size="icon" variant="ghost" onClick={close}>
        <LucideIcon.X />
      </Button>
    </Inline>
  );
};
