import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tryghost/shade/components';

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
// fill and tooltip carry the affordance instead.
//
// It's a second way in, not a second home: the Settings tab's Name field stays,
// and the two are ONE value held by the screen — the raw text, bad values
// included. Type a duplicate name in Settings and the title shows that name,
// in red, rather than stopping at the last letter that was still allowed; the
// title that froze mid-word looked broken. What the screen keeps off the DRAFT
// is a separate matter (see handleDetailsChange): a blank or duplicate name is
// shown here and never saved.
//
// The message itself appears once. The popover belongs to a bad value typed
// HERE, or to this field while it's focused; a bad value typed in Settings
// already has its message under that field, so the title only takes the red
// outline — and keeps it after the panel closes, until the name is fixed.

// How long a bad value has to hold still before the field says so — the
// Settings field's own rule (see side-panel). Clearing a name to retype it
// passes through blank, and extending one passes through a collision; an error
// on that keystroke scolds people mid-thought. Enter and blur don't wait.
const ERROR_DEBOUNCE_MS = 450;

// The title's type, stated once for the input and for the hidden copy that
// sizes it, so the two can't disagree about how wide the name is.
//
// text-lg! because Shade's Input carries text-control (13px) and would win.
// tracking-[inherit] because browsers reset letter-spacing on inputs, and the
// title should be set like the text around it, as it was when it was a span.
const TITLE_TYPE = 'text-lg! font-semibold tracking-[inherit]';

interface EditableTitleProps {
  // The name field's text as it stands, valid or not — shared with the
  // Settings tab's Name field.
  value: string;
  // The name as it currently applies — the last valid one. What Escape falls
  // back to when the field was already holding a bad value on the way in.
  appliedName: string;
  // Whether a name belongs to another automation.
  isTaken: (name: string) => boolean;
  // Every keystroke, raw. The screen applies the valid ones to the draft and
  // keeps the rest off it.
  onChange: (name: string) => void;
}

const errorFor = (text: string, isTaken: (name: string) => boolean): string | null => {
  const name = text.trim();
  if (!name) {
    return 'Add an automation name.';
  }
  if (isTaken(name)) {
    return 'An automation with this name already exists.';
  }
  return null;
};

export const EditableTitle: React.FC<EditableTitleProps> = ({
  value,
  appliedName,
  isTaken,
  onChange,
}) => {
  const [focused, setFocused] = useState(false);
  // Whether the current text was last typed in THIS field — which is what
  // earns a bad value the popover once focus has left (see the note above).
  const [editedHere, setEditedHere] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  // The name when editing began — what Escape puts back.
  const original = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);
  // Escape blurs the field, and that blur mustn't judge the text being thrown away.
  const cancelling = useRef(false);
  // A press focuses the field and then places the caret, which undoes the
  // select-all that focus made. The release re-selects, once per focus.
  const selectOnRelease = useRef(false);
  const errorId = useId();

  const error = errorFor(value, isTaken);
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

  // Text arriving while this field isn't focused was typed somewhere else.
  useEffect(() => {
    if (!focused) {
      setEditedHere(false);
    }
    // Only a change of text hands the value over; losing focus on its own
    // doesn't — a bad name typed here stays this field's to explain.
  }, [value]);

  return (
    <Popover open={invalid && (focused || editedHere)}>
      <TooltipProvider delayDuration={300}>
        <Tooltip
          // "Rename" only while the field is at rest and well. Once the cursor
          // is in it the hint is spent, and on a red field it's the wrong thing
          // to be saying.
          open={tooltipOpen && !focused && !invalid}
          onOpenChange={setTooltipOpen}
        >
          <PopoverAnchor asChild>
            {/* Sized by its own text: an invisible copy of the value sets the
                width and the input fills it, so the field hugs the name and
                the badge beside it doesn't move when the cursor lands.

                -ml-2 only. The field's padding hangs left of the name so its
                first letter stays on the column the plain title sat on, but
                the right edge keeps the row's full gap — pulled in on that
                side too, a focused field touched the status badge. */}
            <div className="-ml-2 inline-grid max-w-full min-w-0">
              <span
                className={`invisible col-start-1 row-start-1 h-8 min-w-[4ch] overflow-hidden px-2 whitespace-pre ${TITLE_TYPE}`}
                aria-hidden
              >
                {value}
              </span>
              <TooltipTrigger asChild>
                <Input
                  ref={inputRef}
                  aria-describedby={invalid ? errorId : undefined}
                  aria-invalid={invalid || undefined}
                  aria-label="Automation name"
                  // Shade's input surface, with its border and fill held back
                  // until they mean something: the ghost button's hover fill
                  // at rest, and the full control — surface, focus ring,
                  // invalid red — once it's focused or wrong. px-[7px] plus
                  // the 1px border is the copy's 8px.
                  className={`col-start-1 row-start-1 h-8 min-w-0 border-transparent bg-transparent px-[7px] py-0 text-ellipsis hover:bg-accent focus-visible:bg-control-surface aria-[invalid=true]:bg-control-surface ${TITLE_TYPE}`}
                  maxLength={191}
                  size={1}
                  value={value}
                  onBlur={() => {
                    setFocused(false);
                    selectOnRelease.current = false;
                    if (cancelling.current) {
                      cancelling.current = false;
                      return;
                    }
                    // A bad name STAYS — red, with its message under it —
                    // until it's corrected or abandoned; quietly showing the
                    // previous name would drop what was typed without saying
                    // so. Leaving says it at once rather than after the wait.
                    if (error) {
                      setShowError(true);
                    }
                  }}
                  onChange={(event) => {
                    setEditedHere(true);
                    onChange(event.target.value);
                  }}
                  onFocus={(event) => {
                    setFocused(true);
                    // What Escape puts back: the name as it was on the way in,
                    // or — if that was already a bad value — the last good one.
                    original.current = error ? appliedName : value;
                    event.target.select();
                    selectOnRelease.current = true;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      if (error) {
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
              </TooltipTrigger>
            </div>
          </PopoverAnchor>
          <TooltipContent side="bottom">Rename</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {/* Stays until the name is fixed: nothing dismisses it but a valid value
          or Escape. It never takes focus — the field is where the fix happens. */}
      <PopoverContent
        align="start"
        className="w-72"
        side="bottom"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <p className="text-md" id={errorId} role="alert">
          {error}
        </p>
      </PopoverContent>
    </Popover>
  );
};
