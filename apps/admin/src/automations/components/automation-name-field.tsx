import React, { useRef } from 'react';
import { Input } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';

// The header title doubles as the name field, styled as plain text until hovered or focused.

// tracking-[inherit] because browsers reset letter-spacing on inputs
const TITLE_TYPE = 'text-control font-medium tracking-[inherit]';

interface AutomationNameFieldProps {
  value: string;
  onChange: (name: string) => void;
}

const AutomationNameField: React.FC<AutomationNameFieldProps> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // Restored on Escape, or on blur when left blank
  const original = useRef(value);
  const cancelling = useRef(false);
  // Clicking places the caret after focus selects the text, so reselect on release
  const selectOnRelease = useRef(false);

  return (
    // The hidden copy sizes the grid so the input hugs the name
    <div className="-ml-2 inline-grid max-w-full min-w-0">
      <span
        className={cn(
          'invisible col-start-1 row-start-1 h-8 min-w-[4ch] overflow-hidden px-2 whitespace-pre',
          TITLE_TYPE,
        )}
        aria-hidden
      >
        {value}
      </span>
      <Input
        ref={inputRef}
        aria-label="Automation name"
        className={cn(
          'col-start-1 row-start-1 h-8 min-w-0 border-transparent bg-transparent px-[7px] py-0 text-ellipsis hover:bg-accent focus-visible:bg-control-surface',
          TITLE_TYPE,
        )}
        maxLength={191}
        size={1}
        value={value}
        onBlur={() => {
          selectOnRelease.current = false;
          if (cancelling.current) {
            cancelling.current = false;
            return;
          }
          if (!value.trim()) {
            onChange(original.current);
          }
        }}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          original.current = value;
          event.target.select();
          selectOnRelease.current = true;
        }}
        onKeyDown={(event) => {
          // Enter and Escape also confirm or cancel an IME candidate
          if (event.nativeEvent.isComposing) {
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            inputRef.current?.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            onChange(original.current);
            cancelling.current = true;
            inputRef.current?.blur();
          }
        }}
        onMouseUp={(event) => {
          if (selectOnRelease.current) {
            selectOnRelease.current = false;
            event.currentTarget.select();
          }
        }}
      />
    </div>
  );
};

export default AutomationNameField;
