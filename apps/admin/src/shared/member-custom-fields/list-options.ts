// The longest an option can be, the same bound as a field's name.
export const MAX_OPTION_LENGTH = 191;

// A list needs something to choose between.
const MIN_OPTIONS = 2;

export const sameOption = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** The options a save sends: trimmed, with empty rows dropped, the way tier benefits are. */
export const cleanListOptions = (options: string[]) =>
  options.map((option) => option.trim()).filter(Boolean);

/** What is wrong with a list's options, if anything, worded for the publisher. */
export const listOptionsError = (options: string[]): string | undefined => {
  const cleaned = cleanListOptions(options);
  if (cleaned.length < MIN_OPTIONS) {
    return 'Add at least two options';
  }
  // Two options that read the same would be one choice to a member, and their answers
  // could never be told apart.
  const repeated = cleaned.find((option, index) =>
    cleaned.slice(0, index).some((earlier) => sameOption(earlier, option)),
  );
  if (repeated) {
    return `“${repeated}” is in the list twice`;
  }
  return undefined;
};

// How a cell holds several answers, as Ghost's own exports write lists such as labels.
export const ANSWER_SEPARATOR = ',';

/** Whether a column's cells read like several answers each, which decides the default. */
export const holdsSeveralAnswers = (cells: string[]) =>
  cells.some((cell) => cell.includes(ANSWER_SEPARATOR));

/**
 * The options a column's cells suggest: every different answer once, in the order they
 * first appear, split into its answers when a cell holds several.
 */
export const optionsFromCells = (cells: string[], several: boolean): string[] =>
  cells
    .flatMap((cell) => (several ? cell.split(ANSWER_SEPARATOR) : [cell]))
    .map((answer) => answer.trim())
    .filter(Boolean)
    .filter((answer, index, all) => all.findIndex((seen) => sameOption(seen, answer)) === index);
