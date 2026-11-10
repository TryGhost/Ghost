import { arrayMove } from '@dnd-kit/sortable';
import { SetSettingsSchema } from '@tryghost/metafield-types';
import { optionKey, optionText, type SetSettings } from '@tryghost/metafield-types/structure';

/** An option typed into this form, whose text can still change. */
export interface UnsavedOptionRow {
  readonly id: string;
  readonly text: string;
  readonly saved: false;
}

/**
 * An option the field is saved with. Its text is fixed, as the field's type is: an option is named
 * by its text alone, so changed text would be a different option, and members who picked the old
 * text would keep it.
 */
export interface SavedOptionRow {
  readonly id: string;
  readonly text: string;
  readonly saved: true;
}

/** An option as a list field's form holds it. The id stays the same while its text is typed. */
export type OptionRow = UnsavedOptionRow | SavedOptionRow;

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

/** A row for `text`: a saved option when the field is saved offering that exact text. */
const optionRow = (text: string, saved: SetSettings | null): OptionRow => {
  lastOptionId += 1;
  const id = `option-${lastOptionId}`;
  return saved?.options.includes(optionText(text))
    ? { id, text, saved: true }
    : { id, text, saved: false };
};

/** The inputs for a list that isn't saved yet, starting from `start`. */
export const newListInputs = (start: SetSettings): ListInputs => ({
  options: start.options.map((text) => optionRow(text, null)),
  newOption: '',
  multiple: start.multiple,
  saved: null,
});

/** The inputs for a list saved with `saved`, each of its options a saved option. */
export const savedListInputs = (saved: SetSettings): ListInputs => ({
  options: saved.options.map((text) => optionRow(text, saved)),
  newOption: '',
  multiple: saved.multiple,
  saved,
});

/**
 * The settings the inputs ask for. Text typed but not yet added is asked for as the last option, as
 * a tier's typed benefit is, so it is checked and saved with the rest.
 */
export const settingsOf = ({ options, newOption, multiple }: ListInputs): SetSettings => {
  const typed = optionText(newOption);
  return {
    options: [...options.map((option) => optionText(option.text)), ...(typed ? [typed] : [])],
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

/** The inputs with an unsaved option's text changed. A saved option's text can't change. */
export const withOptionText = (
  list: ListInputs,
  option: UnsavedOptionRow,
  text: string,
): ListInputs => ({
  ...list,
  options: list.options.map((other) => (other.id === option.id ? { ...option, text } : other)),
});

/**
 * The inputs with each of `texts` added as an option, in order, and the typed text cleared. Empty
 * text and options the list already offers are skipped, so a pasted list is tidied rather than
 * refused. An option the field is saved with is saved again when it is added back.
 */
export const withAdded = (list: ListInputs, texts: readonly string[]): ListInputs => {
  const offered = new Set(list.options.map((option) => optionKey(option.text)));
  const added: OptionRow[] = [];
  for (const text of texts.map(optionText)) {
    const key = optionKey(text);
    if (text !== '' && !offered.has(key)) {
      offered.add(key);
      added.push(optionRow(text, list.saved));
    }
  }
  return { ...list, options: [...list.options, ...added], newOption: '' };
};

/** The rules' problems with a list's options as a whole, such as there being too many. */
const wholeListProblems = (settings: SetSettings): string[] =>
  (SetSettingsSchema.safeParse(settings).error?.issues ?? [])
    .filter((issue) => issue.path.length === 1 && issue.path[0] === 'options')
    .map((issue) => issue.message);

/**
 * The inputs with the typed text added as an option, or why the rules refuse it as the list's next
 * option, in their words: a problem with the text itself, or one it would make for the list as a
 * whole, such as one option too many. Typed text that is only spaces is cleared.
 */
export const withTypedAdded = (list: ListInputs): ListInputs | { readonly refused: string } => {
  const settings = settingsOf(list);
  const typedAt = list.options.length;
  if (settings.options.length === typedAt) {
    return withNewOption(list, '');
  }
  const textProblem = SetSettingsSchema.safeParse(settings).error?.issues.find(
    (issue) => issue.path[0] === 'options' && issue.path[1] === typedAt,
  )?.message;
  const before = new Set(wholeListProblems(settingsOf(withNewOption(list, ''))));
  const refusal =
    textProblem ?? wholeListProblems(settings).find((problem) => !before.has(problem));
  return refusal ? { refused: refusal } : withAdded(list, [list.newOption]);
};

/**
 * The options in the order their text is checked in: saved options first. The rules refuse a
 * repeat on the later of two options that are the same, and of two such options the one to change
 * is never a saved one, whose text can't change.
 */
export const inCheckingOrder = (options: readonly OptionRow[]): OptionRow[] => [
  ...options.filter((option) => option.saved),
  ...options.filter((option) => !option.saved),
];
