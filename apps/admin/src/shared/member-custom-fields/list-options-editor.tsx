import React from 'react';
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

/**
 * The options a list field offers, in the order members are offered them: added one at a time or
 * as a pasted list with one option per line, dragged to reorder, and removed.
 *
 * Text typed but not yet added is saved as an option with the rest, as a tier's benefits are.
 *
 * An option can't be renamed. Its text is all that names it, so different text is a different
 * option: changing a typo is removing the option and adding the right one, and members who picked
 * the old text keep it.
 */
const ListOptionsEditor: React.FC<{
  options: string[];
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
  /** The options and the typed text together, so a change to both is one change. */
  onChange: (next: { options: string[]; newOption: string }) => void;
}> = ({
  options,
  newOption,
  error,
  optionErrors = [],
  newOptionError,
  disabled,
  idPrefix,
  onChange,
}) => {
  const setOptions = (next: string[]) => onChange({ options: next, newOption });
  const setNewOption = (text: string) => onChange({ options, newOption: text });

  // Text already offered is skipped rather than added and then refused.
  const add = (texts: string[]) => {
    const added = texts
      .map(optionText)
      .filter((text, index, all) => text !== '' && all.indexOf(text) === index)
      .filter((text) => !options.includes(text));
    onChange({ options: [...options, ...added], newOption: '' });
  };

  // Drawn in an input's box, like a tier's benefits, but read rather than edited: an option's text
  // is what names it. The box grows with a long option rather than holding it to one line, and
  // wrap-anywhere rather than break-words, since an option can be one unbroken word that would
  // otherwise widen the whole form.
  const optionRow = (option: string, removable: boolean) => {
    const index = options.indexOf(option);
    const problem = optionErrors[index];
    const problemId = `${idPrefix}-option-${index}-error`;
    return (
      <Stack className="min-w-0 grow" gap="xs">
        <InputGroup className="h-auto min-h-(--control-height)">
          <span
            aria-describedby={problem ? problemId : undefined}
            aria-invalid={Boolean(problem) || undefined}
            className="flex min-w-0 flex-1 items-center px-3 py-1.5 text-control wrap-anywhere"
          >
            {option}
          </span>
          {removable && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-describedby={problem ? problemId : undefined}
                aria-label={`Remove ${option}`}
                className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                shape="rounded"
                size="icon-xs"
                variant="secondary"
                onClick={() => setOptions(options.filter((other) => other !== option))}
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
      data-invalid={Boolean(error || newOptionError || optionErrors.some(Boolean)) || undefined}
    >
      <FieldLegend variant="label">Options</FieldLegend>
      <Stack gap="sm">
        {disabled ? (
          // Options that can't be changed are listed in order, with nothing to move, remove or
          // add, as an archived field is in the list of fields.
          <Stack gap="sm">
            {options.map((option) => (
              <div key={option}>{optionRow(option, false)}</div>
            ))}
          </Stack>
        ) : (
          <div>
            <SortableList
              getDragHandleLabel={({ id }) => `Reorder ${id}`}
              items={options.map((option) => ({ id: option }))}
              itemSeparator={false}
              renderItem={({ id }) => optionRow(id, true)}
              onMove={(id, overId) =>
                setOptions(arrayMove(options, options.indexOf(id), options.indexOf(overId)))
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
                    aria-describedby={
                      [
                        newOptionError && `${idPrefix}-new-option-error`,
                        error && `${idPrefix}-options-error`,
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                    aria-invalid={Boolean(error || newOptionError) || undefined}
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
                        add([newOption]);
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
                      onClick={() => add([newOption])}
                    >
                      <LucideIcon.Plus />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {newOptionError && (
                  <FieldError id={`${idPrefix}-new-option-error`}>{newOptionError}</FieldError>
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
