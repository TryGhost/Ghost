import React, { useRef } from 'react';
import { Input } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';
import { useShade } from '@tryghost/shade/app';

// The header title doubles as the name field, styled as plain text until hovered or focused.

// tracking-[inherit] because browsers reset letter-spacing on inputs
const TITLE_TYPE = 'text-control font-medium tracking-[inherit]';

interface AutomationNameFieldProps {
  value: string;
  onChange: (name: string) => void;
  // Gives the title its own surface, for a header floating over the canvas
  surface?: boolean;
}

const AutomationNameField: React.FC<AutomationNameFieldProps> = ({
  value,
  onChange,
  surface = false,
}) => {
  const { controlShape } = useShade();
  // The input's 1px border sits inside its padding, so it pads 1px less than the hidden copy
  let box = { copy: 'h-8 px-2', input: 'h-8 bg-transparent px-[7px]' };
  if (surface) {
    const shape = controlShape === 'pill' ? 'rounded-full' : 'rounded-control';
    box = {
      copy: 'h-(--control-height) px-3',
      input: cn('h-(--control-height) bg-surface-elevated px-[11px]', shape),
    };
  }
  const inputRef = useRef<HTMLInputElement>(null);
  // Restored on Escape, or on blur when left blank
  const original = useRef(value);
  const cancelling = useRef(false);
  // Clicking places the caret after focus selects the text, so reselect on release
  const selectOnRelease = useRef(false);

  return (
    // The hidden copy sizes the grid so the input hugs the name
    <div className={cn('inline-grid max-w-full min-w-0', !surface && '-ml-2')}>
      <span
        className={cn(
          'invisible col-start-1 row-start-1 min-w-[4ch] overflow-hidden whitespace-pre',
          box.copy,
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
          'col-start-1 row-start-1 min-w-0 border-transparent py-0 text-ellipsis hover:bg-accent focus-visible:bg-control-surface',
          box.input,
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
          // During IME input (e.g. Japanese or Chinese), Enter and Escape control
          // character selection. This early return lets the input method handle them.
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
