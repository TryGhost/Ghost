import { arrayMove } from '@dnd-kit/sortable';
import { optionText, type SetSettings } from '@tryghost/metafield-types/structure';

/** An option as a list field's form holds it. The id stays the same as it moves. */
export interface OptionRow {
  readonly id: string;
  readonly text: string;
}

/**
 * What a list field's form holds: the options in the order members are offered them, the text
 * typed into the new option input but not yet added, whether a member can pick more than one, and
 * the settings the field is saved with, or null for a field that isn't saved yet.
 */
export interface ListInputs {
  readonly options: readonly OptionRow[];
  readonly newOption: string;
  readonly multiple: boolean;
  readonly saved: SetSettings | null;
}

let lastOptionId = 0;

const optionRow = (text: string): OptionRow => {
  lastOptionId += 1;
  return { id: `option-${lastOptionId}`, text };
};

/** The inputs for a list that isn't saved yet, starting from `start`. */
export const newListInputs = (start: SetSettings): ListInputs => ({
  options: start.options.map(optionRow),
  newOption: '',
  multiple: start.multiple,
  saved: null,
});

/** The inputs for a list saved with `saved`. */
export const savedListInputs = (saved: SetSettings): ListInputs => ({
  options: saved.options.map(optionRow),
  newOption: '',
  multiple: saved.multiple,
  saved,
});

/**
 * The settings the inputs ask for. Text typed but not yet added is saved as the last option, as a
 * tier's typed benefit is, unless the list already offers it.
 */
export const settingsOf = ({ options, newOption, multiple }: ListInputs): SetSettings => {
  const texts = options.map((option) => optionText(option.text));
  const typed = optionText(newOption);
  return {
    options: typed === '' || texts.includes(typed) ? texts : [...texts, typed],
    multiple,
  };
};

export const withNewOption = (list: ListInputs, newOption: string): ListInputs => ({
  ...list,
  newOption,
});

export const withMultiple = (list: ListInputs, multiple: boolean): ListInputs => ({
  ...list,
  multiple,
});

export const withoutOption = (list: ListInputs, option: OptionRow): ListInputs => ({
  ...list,
  options: list.options.filter((other) => other.id !== option.id),
});

/**
 * The inputs with the option whose id is `id` moved to where the option whose id is `overId` is.
 * Unchanged when either is no longer among the options.
 */
export const withMoved = (list: ListInputs, id: string, overId: string): ListInputs => {
  const from = list.options.findIndex((option) => option.id === id);
  const to = list.options.findIndex((option) => option.id === overId);
  return from === -1 || to === -1
    ? list
    : { ...list, options: arrayMove([...list.options], from, to) };
};

/**
 * The inputs with each of `texts` added as an option, in order, and the typed text cleared. Empty
 * text and text the list already offers are skipped rather than added and then refused.
 */
export const withAdded = (list: ListInputs, texts: readonly string[]): ListInputs => {
  const offered = new Set(list.options.map((option) => optionText(option.text)));
  const added: OptionRow[] = [];
  for (const text of texts.map(optionText)) {
    if (text !== '' && !offered.has(text)) {
      offered.add(text);
      added.push(optionRow(text));
    }
  }
  return { ...list, options: [...list.options, ...added], newOption: '' };
};
