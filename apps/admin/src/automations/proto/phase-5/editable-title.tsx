import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Input,
  InputGroupButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';

// The automation's name in the header, renamed where it's read.
//
// The title was plain text, with renaming one tab deep in a sidebar that's
// closed on anything not live — and two people on the team couldn't find it.
// The build's answer was opening that sidebar on Settings at creation, which
// fixes the first minute and nothing after it. This fixes the place people
// look: hover says the title is a field, a press puts the cursor in it.
//
// ONE ELEMENT, ALWAYS: a Shade Input that is dressed as a title until it's
// hovered or focused. The first pass swapped a Button for an Input on press,
// and every difference between those two components showed up as a jump —
// text size, letter-spacing, width. An input that is simply always there has
// no second state to drift from. It's also the honest thing to tell assistive
// tech: this is a text field named "Automation name", and it says so before
// anyone has to discover that a title was secretly a button.
//
// No standing pencil. The status badge sits straight after the name, and a
// permanent icon between the two made the row read as three things. The hover
// fill carries the affordance instead. (A "Rename" tooltip was tried with it
// and removed.)
//
// The only place to rename: the Settings tab's Name field was removed, so the
// name has one home and one place to say what's wrong with it. A blank name
// reverts on leaving; a duplicate stays, red, with its message, and the screen
// won't save or publish until it's fixed (see focusRequest).
//
// The error is a red alert icon at the field's trailing end, and the message
// is one press away on it. The header is one 64px row with no room under the
// title, so a message that's always shown had nowhere good to go: a popover
// was a lot of frame around three words, and Shade's FieldError at its own
// spacing ran into the header's rule. The red border says something's wrong;
// the icon says where to ask what.

// How long a bad value has to hold still before the field says so. Extending a
// name passes through collisions, and an error on that keystroke scolds people
// mid-thought. Enter and blur don't wait.
const ERROR_DEBOUNCE_MS = 450;

// The title's type, stated once for the input and for the hidden copy that
// sizes it, so the two can't disagree about how wide the name is.
//
// text-lg! because Shade's Input carries text-control (13px) and would win.
// tracking-[inherit] because browsers reset letter-spacing on inputs, and the
// title should be set like the text around it, as it was when it was a span.
const TITLE_TYPE = 'text-lg! font-semibold tracking-[inherit]';

interface EditableTitleProps {
  // The name field's text as it stands, valid or not.
  value: string;
  // The name as it currently applies — the last valid one. What Escape falls
  // back to when the field was already holding a bad value on the way in.
  appliedName: string;
  // Whether a name belongs to another automation.
  isTaken: (name: string) => boolean;
  // Every keystroke, raw. The screen applies the valid ones to the draft and
  // keeps the rest off it.
  onChange: (name: string) => void;
  // Bumped by the screen when Save is refused over the name: the field takes
  // focus and shows its message at once. (Publish doesn't: its refusal is the
  // one "Fix all issues" popover on the button, covering the name and the
  // canvas together.)
  focusRequest?: number;
}

const errorFor = (text: string, isTaken: (name: string) => boolean): string | null => {
  const name = text.trim();
  if (!name) {
    return 'Add an automation name.';
  }
  if (isTaken(name)) {
    return 'Name already in use';
  }
  return null;
};

export const EditableTitle: React.FC<EditableTitleProps> = ({
  value,
  appliedName,
  isTaken,
  onChange,
  focusRequest = 0,
}) => {
  // The name when editing began — what Escape puts back.
  const original = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);
  // Escape blurs the field, and that blur mustn't judge the text being thrown away.
  const cancelling = useRef(false);
  // A press focuses the field and then places the caret, which undoes the
  // select-all that focus made. The release re-selects, once per focus.
  const selectOnRelease = useRef(false);
  const errorId = useId();

  const nameError = errorFor(value, isTaken);
  // A blank is never reported — leaving the field puts the name back, so there's
  // nothing to fix.
  const error = value.trim() ? nameError : null;
  const [showError, setShowError] = useState(false);
  useEffect(() => {
    if (!error) {
      setShowError(false);
      return;
    }
    const timer = setTimeout(() => setShowError(true), ERROR_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `value` restarts the wait on every keystroke.
  }, [error, value]);
  const invalid = showError && Boolean(error);
  // The message popover, opened from the icon.
  const [messageOpen, setMessageOpen] = useState(false);
  useEffect(() => {
    if (!invalid) {
      setMessageOpen(false);
    }
  }, [invalid]);

  // A refused Save opens the message too: the press was a question
  // ("why not?"), so it gets the answer without a second click.
  useEffect(() => {
    if (focusRequest > 0) {
      inputRef.current?.focus();
      setShowError(true);
      setMessageOpen(true);
    }
  }, [focusRequest]);

  return (
    // Sized by its own text: an invisible copy of the value sets the width and
    // the input fills it, so the field hugs the name and the badge beside it
    // doesn't move when the cursor lands.
    //
    // -ml-2 only. The field's padding hangs left of the name so its first
    // letter stays on the column the plain title sat on, but the right edge
    // keeps the row's full gap — pulled in on that side too, a focused field
    // touched the status badge.
    <div className="relative -ml-2 inline-grid max-w-full min-w-0">
      <span
        className={cn(
          'invisible col-start-1 row-start-1 h-8 min-w-[4ch] overflow-hidden px-2 whitespace-pre',
          // Room for the icon, so the field grows to hold it rather than
          // covering the end of the name.
          invalid && 'pr-8',
          TITLE_TYPE,
        )}
        aria-hidden
      >
        {value}
      </span>
      <Input
        ref={inputRef}
        aria-describedby={invalid ? errorId : undefined}
        aria-invalid={invalid || undefined}
        aria-label="Automation name"
        // Shade's input surface with its border held back for good:
        // the ghost button's hover fill at rest, the control's surface
        // while focused, and no border or focus ring in any state —
        // focused, invalid or both. The field reads as the title
        // throughout; the red icon carries an error on its own.
        // px-[7px] plus the (transparent) 1px border is the copy's 8px
        // (and pr-[31px] its pr-8).
        //
        // The overrides undo what Shade's Input adds: the blue border
        // and ring on focus-visible, the red border on aria-invalid.
        // aria-invalid itself stays, for screen readers.
        className={cn(
          'col-start-1 row-start-1 h-8 min-w-0 border-transparent bg-transparent px-[7px] py-0 text-ellipsis hover:bg-accent focus-visible:bg-control-surface',
          'focus-visible:border-transparent focus-visible:ring-0 aria-[invalid=true]:border-transparent',
          invalid && 'pr-[31px]',
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
          // Left blank, the title goes back to the name it had:
          // there's nothing typed to lose, and a header with no
          // name in it reads as broken.
          if (!value.trim()) {
            onChange(original.current);
            return;
          }
          // A duplicate STAYS — red, with its message under it —
          // until it's corrected or abandoned; quietly showing the
          // previous name would drop what was typed without saying
          // so. Leaving says it at once rather than after the wait.
          if (nameError) {
            setShowError(true);
          }
        }}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          // What Escape puts back: the name as it was on the way in,
          // or — if that was already a bad value — the last good one.
          original.current = nameError ? appliedName : value;
          event.target.select();
          selectOnRelease.current = true;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            // Blank is let through: blurring puts the name back.
            if (nameError && value.trim()) {
              setShowError(true);
            } else {
              inputRef.current?.blur();
            }
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
      {/* The trailing icon. A button, not a bare icon: it's how the message
          is reached by keyboard and announced. InputGroupButton at icon-xs,
          Shade's clickable icon inside a field: a 24px button around a 16px
          icon, inset 4px from the edge as Shade insets it — (32 − 24) / 2 —
          so the gaps above, below and beside it match. Red rather than
          Shade's muted addon gray: the icon is the only thing saying "press
          here for why". The message is also on the input
          itself (aria-describedby, below), so a screen reader hears it from
          the field without needing the button. */}
      {invalid && (
        <Popover open={messageOpen} onOpenChange={setMessageOpen}>
          <PopoverTrigger asChild>
            <InputGroupButton
              aria-label="Show name error"
              className="absolute top-1/2 right-1 -translate-y-1/2 text-destructive hover:text-destructive"
              size="icon-xs"
            >
              <LucideIcon.CircleAlert strokeWidth={2} />
            </InputGroupButton>
          </PopoverTrigger>
          {/* Styled like the screen's other popovers (the Publish one in
              detail): Shade's own padding, the message as Text at md. Only
              the width differs — w-auto, sized to three words rather than
              the Publish popover's w-72. It never takes focus — the field
              is where the fix happens. */}
          <PopoverContent
            align="end"
            className="w-auto"
            side="bottom"
            onCloseAutoFocus={(event) => event.preventDefault()}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <Text size="md">{error}</Text>
          </PopoverContent>
        </Popover>
      )}
      {invalid && (
        <span className="sr-only" id={errorId}>
          {error}
        </span>
      )}
    </div>
  );
};
