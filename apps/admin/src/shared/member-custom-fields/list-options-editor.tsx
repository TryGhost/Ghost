import React, { useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  SortableList,
} from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { optionText } from '@tryghost/metafield-types/structure';
import { type OptionRow, optionRow } from '@/shared/member-custom-fields/list-option-row';
import { REPEATED_OPTION } from '@/shared/member-custom-fields/custom-field-draft';

/**
 * The options a list field offers, in the order members are offered them: added one at a time or
 * as a pasted list with one option per line, dragged to reorder, and removed.
 *
 * Text typed but not yet added is saved as an option with the rest, as a tier's benefits are.
 *
 * An option's text can be changed until the field is saved with it, as the field's type can.
 * After that, changing a typo is removing the option and adding the right one.
 */
const ListOptionsEditor: React.FC<{
  options: OptionRow[];
  /** What is typed into the new option input, which the form saves as an option too. */
  newOption: string;
  /** A problem with the options as a whole, such as too few of them. */
  error?: string;
  /** A problem with one option, by its position, shown on its row. */
  optionErrors?: ReadonlyArray<string | undefined>;
  /** A problem with the typed text, which would be saved as the last option. */
  newOptionError?: string;
  disabled?: boolean;
  // Prefixes the inputs' ids, as the form's other inputs are.
  idPrefix: string;
  /**
   * The options the field is saved with, so one removed and added again is saved still, and its
   * text stays fixed.
   */
  savedOptions?: readonly string[];
  /** The options and the typed text together, so a change to both is one change. */
  onChange: (next: { options: OptionRow[]; newOption: string }) => void;
}> = ({
  options,
  savedOptions = [],
  newOption,
  error,
  optionErrors = [],
  newOptionError,
  disabled,
  idPrefix,
  onChange,
}) => {
  // Typed text that is already an option, kept in the input with the reason it wasn't added.
  const [repeated, setRepeated] = useState(false);
  const setOptions = (next: OptionRow[]) => {
    setRepeated(false);
    onChange({ options: next, newOption });
  };
  const setNewOption = (text: string) => {
    setRepeated(false);
    onChange({ options, newOption: text });
  };
  const typedProblem = newOptionError ?? (repeated ? REPEATED_OPTION : undefined);
  const setText = (id: string, text: string) =>
    setOptions(options.map((row) => (row.id === id ? { ...row, text } : row)));

  // The nearest ancestor that scrolls, such as a modal's body, or none.
  const scrollerOf = (element: HTMLElement): HTMLElement | null => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) {
        return parent;
      }
    }
    return null;
  };

  // Each option added pushes the new option input a row down. It keeps its focus and its place on
  // screen, as a tier's new benefit input does, so a list can be typed in one go and a long one
  // doesn't carry the input under a pinned footer. The scroll is instant: the input is meant not
  // to move, and a smooth one still running when the next option is added would make it drift.
  const newOptionRef = useRef<HTMLInputElement>(null);
  const keepNewOptionInPlace = () => {
    const input = newOptionRef.current;
    const before = input?.getBoundingClientRect().top;
    window.requestAnimationFrame(() => {
      if (!input || before === undefined) {
        return;
      }
      // Focus goes back only if it hasn't gone somewhere else meanwhile: it is on the input, on
      // the add button clicked, or on nothing.
      const active = document.activeElement;
      const group = input.closest('[data-slot="input-group"]');
      if (active && active !== document.body && !group?.contains(active)) {
        return;
      }
      input.focus({ preventScroll: true });
      scrollerOf(input)?.scrollBy({ top: input.getBoundingClientRect().top - before });
    });
  };

  // Text already offered is skipped rather than added and then refused.
  const add = (texts: string[]) => {
    const offered = options.map((row) => optionText(row.text));
    const added = texts
      .map(optionText)
      .filter((text, index, all) => text !== '' && all.indexOf(text) === index)
      .filter((text) => !offered.includes(text))
      .map((text) => optionRow(text, savedOptions.includes(text)));
    setRepeated(false);
    onChange({ options: [...options, ...added], newOption: '' });
    keepNewOptionInPlace();
  };

  // One option typed and added is refused if it's already offered, rather than cleared as if it
  // had been added. A pasted list skips its repeats instead, as tidying a list someone has.
  const addTyped = () => {
    const text = optionText(newOption);
    if (text !== '' && options.some((row) => optionText(row.text) === text)) {
      setRepeated(true);
      return;
    }
    add([newOption]);
  };

  // An option not yet saved is an input, like a tier's benefit. A saved one is drawn in a disabled
  // input's box, as the type is once saved, and grows with a long option rather than holding it
  // to one line: wrap-anywhere rather than break-words, since an option can be one unbroken word
  // that would otherwise widen the whole form.
  const renderRow = (row: OptionRow, index: number, removable: boolean) => {
    const problem = optionErrors[index];
    const problemId = `${idPrefix}-option-${index}-error`;
    const name = optionText(row.text) || `option ${index + 1}`;
    const editable = removable && !row.saved;
    return (
      <Stack className="min-w-0 grow" gap="xs">
        <InputGroup
          className={editable ? undefined : 'h-auto min-h-(--control-height)'}
          data-disabled={!editable || undefined}
        >
          {editable ? (
            <InputGroupInput
              aria-describedby={problem ? problemId : undefined}
              aria-invalid={Boolean(problem) || undefined}
              aria-label={`Option ${index + 1}`}
              value={row.text}
              onChange={(event) => setText(row.id, event.target.value)}
            />
          ) : (
            <span
              aria-describedby={problem ? problemId : undefined}
              aria-invalid={Boolean(problem) || undefined}
              className="flex min-w-0 flex-1 cursor-not-allowed items-center px-3 py-1 text-control wrap-anywhere text-muted-foreground"
            >
              {row.text}
            </span>
          )}
          {removable && (
            <InputGroupAddon align="inline-end" className={editable ? undefined : 'py-0'}>
              <InputGroupButton
                aria-describedby={problem ? problemId : undefined}
                aria-label={`Remove ${name}`}
                className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                shape="rounded"
                size="icon-xs"
                variant="secondary"
                onClick={() => setOptions(options.filter((other) => other.id !== row.id))}
              >
                <LucideIcon.Trash2 />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        {problem && <FieldError id={problemId}>{problem}</FieldError>}
      </Stack>
    );
  };

  return (
    <FieldSet
      data-invalid={Boolean(error || typedProblem || optionErrors.some(Boolean)) || undefined}
    >
      <FieldLegend variant="label">Options</FieldLegend>
      <Stack gap="sm">
        {disabled ? (
          // Options that can't be changed are listed in order, with nothing to move, remove or
          // add, as an archived field is in the list of fields.
          <Stack gap="sm">
            {options.map((row, index) => (
              <div key={row.id}>{renderRow(row, index, false)}</div>
            ))}
          </Stack>
        ) : (
          <div>
            <SortableList
              getDragHandleLabel={({ index }) =>
                `Reorder ${optionText(options[index].text) || `option ${index + 1}`}`
              }
              items={options.map((row, index) => ({ id: row.id, index }))}
              itemSeparator={false}
              renderItem={({ index }) => renderRow(options[index], index, true)}
              onMove={(id, overId) =>
                setOptions(
                  arrayMove(
                    options,
                    options.findIndex((row) => row.id === id),
                    options.findIndex((row) => row.id === overId),
                  ),
                )
              }
            />
            <Inline align="center" className="py-1" gap="md">
              <LucideIcon.Plus
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
              <Field className="w-full">
                <FieldLabel className="sr-only" htmlFor={`${idPrefix}-new-option`}>
                  New option
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    ref={newOptionRef}
                    aria-describedby={
                      [
                        typedProblem && `${idPrefix}-new-option-error`,
                        error && `${idPrefix}-options-error`,
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                    aria-invalid={Boolean(error || typedProblem) || undefined}
                    id={`${idPrefix}-new-option`}
                    placeholder="Add an option"
                    value={newOption}
                    onChange={(event) => setNewOption(event.target.value)}
                    onKeyDown={(event) => {
                      // Enter that confirms what an input method is composing isn't adding an
                      // option: the composed text isn't in the input yet.
                      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
                        return;
                      }
                      // Enter adds the option rather than saving the form around it.
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        event.stopPropagation();
                        addTyped();
                      }
                    }}
                    // A paste of several lines is a list someone already has, so each line is an
                    // option. Text already typed is kept, around the paste as the input would
                    // have placed it.
                    onPaste={(event) => {
                      const pasted = event.clipboardData.getData('text');
                      if (!/\r?\n/.test(pasted)) {
                        return;
                      }
                      event.preventDefault();
                      const { selectionStart, selectionEnd } = event.currentTarget;
                      const before = newOption.slice(0, selectionStart ?? newOption.length);
                      const after = newOption.slice(selectionEnd ?? newOption.length);
                      add(`${before}${pasted}${after}`.split(/\r?\n/));
                    }}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label="Add option"
                      shape="rounded"
                      size="icon-xs"
                      variant="default"
                      onClick={addTyped}
                    >
                      <LucideIcon.Plus />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {typedProblem && (
                  <FieldError id={`${idPrefix}-new-option-error`}>{typedProblem}</FieldError>
                )}
              </Field>
            </Inline>
          </div>
        )}
        {error && <FieldError id={`${idPrefix}-options-error`}>{error}</FieldError>}
      </Stack>
    </FieldSet>
  );
};

export default ListOptionsEditor;
