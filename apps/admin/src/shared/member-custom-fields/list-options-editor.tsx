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
  error?: string;
  disabled?: boolean;
  // Prefixes the new option input's id, as the form's other inputs are.
  idPrefix: string;
  /** The options and the typed text together, so a change to both is one change. */
  onChange: (next: { options: string[]; newOption: string }) => void;
}> = ({ options, newOption, error, disabled, idPrefix, onChange }) => {
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

  return (
    <FieldSet data-invalid={Boolean(error) || undefined}>
      <FieldLegend variant="label">Options</FieldLegend>
      <Stack gap="sm">
        <div>
          <SortableList
            getDragHandleLabel={({ id }) => `Reorder ${id}`}
            items={options.map((option) => ({ id: option }))}
            itemSeparator={false}
            renderItem={({ id }) => (
              // Drawn in an input's box, like a tier's benefits, but read rather than edited: an
              // option's text is what names it. The box grows with a long option rather than
              // holding it to one line.
              <InputGroup className="h-auto min-h-(--control-height) grow">
                <span className="flex min-w-0 flex-1 items-center px-3 py-1.5 text-control break-words">
                  {id}
                </span>
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={`Remove ${id}`}
                    className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                    disabled={disabled}
                    shape="rounded"
                    size="icon-xs"
                    variant="secondary"
                    onClick={() => setOptions(options.filter((option) => option !== id))}
                  >
                    <LucideIcon.Trash2 />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            )}
            onMove={(id, overId) =>
              setOptions(arrayMove(options, options.indexOf(id), options.indexOf(overId)))
            }
          />
          <Inline align="center" className="py-1" gap="md">
            <LucideIcon.Plus aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <Field className="w-full">
              <FieldLabel className="sr-only" htmlFor={`${idPrefix}-new-option`}>
                New option
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  aria-invalid={Boolean(error) || undefined}
                  disabled={disabled}
                  id={`${idPrefix}-new-option`}
                  placeholder="Add an option"
                  value={newOption}
                  onChange={(event) => setNewOption(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter adds the option rather than saving the form around it.
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.stopPropagation();
                      add([newOption]);
                    }
                  }}
                  // A paste of several lines is a list someone already has, so each line is an
                  // option.
                  onPaste={(event) => {
                    const lines = event.clipboardData.getData('text').split(/\r?\n/);
                    if (lines.length > 1) {
                      event.preventDefault();
                      add(lines);
                    }
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Add option"
                    disabled={disabled}
                    shape="rounded"
                    size="icon-xs"
                    variant="default"
                    onClick={() => add([newOption])}
                  >
                    <LucideIcon.Plus />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </Inline>
        </div>
        {error && <FieldError>{error}</FieldError>}
      </Stack>
    </FieldSet>
  );
};

export default ListOptionsEditor;
