import React, { useRef } from 'react';
import useSortableIndexedList from '@/shared/use-sortable-indexed-list';
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
import { MAX_OPTION_LENGTH, sameOption } from './list-options';

/**
 * The options of a list field, in the order members are offered them: renamed in place,
 * dragged to reorder, removed, and added one at a time or as a pasted list with one
 * option per line. Modelled on a tier's benefits.
 */
const ListOptionsEditor: React.FC<{
  options: string[];
  error?: string;
  // Prefixes the new option input's id, as the form's other inputs are.
  idPrefix: string;
  onChange: (options: string[]) => void;
}> = ({ options, error, idPrefix, onChange }) => {
  const list = useSortableIndexedList({
    items: options,
    setItems: onChange,
    blank: '',
    canAddNewItem: (option) => option.trim() !== '',
  });
  const newOptionInputRef = useRef<HTMLInputElement>(null);

  const addOption = () => {
    list.addItem();
    newOptionInputRef.current?.focus();
  };

  // A paste of several lines is a list someone already has, so each line becomes an
  // option. Lines already in the list, or repeated in the paste, are skipped rather than
  // added and then flagged.
  const addPastedOptions = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const lines = event.clipboardData
      .getData('text')
      .split(/\r?\n/)
      .map((line) => line.trim().slice(0, MAX_OPTION_LENGTH))
      .filter(Boolean);
    if (lines.length < 2) {
      return;
    }
    event.preventDefault();
    const taken = list.items.map(({ item }) => item);
    const added = lines.filter((line, index) =>
      [...taken, ...lines.slice(0, index)].every((option) => !sameOption(option, line)),
    );
    list.addItems(added);
    list.setNewItem('');
  };

  return (
    <FieldSet data-invalid={Boolean(error) || undefined}>
      <FieldLegend variant="label">Options</FieldLegend>
      <Stack gap="sm">
        <div>
          <SortableList
            getDragHandleLabel={({ item }) => `Reorder option${item ? `: ${item}` : ''}`}
            items={list.items}
            itemSeparator={false}
            renderItem={({ id, item }) => (
              <InputGroup className="grow">
                <InputGroupInput
                  aria-label="Option"
                  maxLength={MAX_OPTION_LENGTH}
                  value={item}
                  onChange={(e) => list.updateItem(id, e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={`Remove option${item ? `: ${item}` : ''}`}
                    className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                    shape="rounded"
                    size="icon-xs"
                    variant="secondary"
                    onClick={() => list.removeItem(id)}
                  >
                    <LucideIcon.Trash2 />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            )}
            onMove={list.moveItem}
          />
          <Inline align="center" className="py-1" gap="md">
            <LucideIcon.Plus aria-hidden="true" className="size-4 text-muted-foreground" />
            <Field className="w-full">
              <FieldLabel className="sr-only" htmlFor={`${idPrefix}-new-option`}>
                New option
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  ref={newOptionInputRef}
                  id={`${idPrefix}-new-option`}
                  maxLength={MAX_OPTION_LENGTH}
                  placeholder="Add an option"
                  value={list.newItem}
                  onChange={(e) => list.setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                  onPaste={addPastedOptions}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Add option"
                    shape="rounded"
                    size="icon-xs"
                    variant="default"
                    onClick={addOption}
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
