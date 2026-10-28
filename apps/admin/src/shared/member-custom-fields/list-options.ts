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
const ANSWER_SEPARATOR = ',';

// More different answers than this, and a column is free text rather than a list, so it
// suggests no options at all rather than hundreds a publisher would have to delete.
const MAX_SUGGESTED_OPTIONS = 50;

/** Whether a column's cells read like several answers each, which decides the default. */
export const holdsSeveralAnswers = (cells: string[]) =>
  cells.some((cell) => cell.includes(ANSWER_SEPARATOR));

/**
 * The options a column's cells suggest: every different answer once, in the order they
 * first appear, split into its answers when a cell holds several. One pass, since an import
 * column can run to tens of thousands of rows, and none at all past MAX_SUGGESTED_OPTIONS.
 */
export const optionsFromCells = (cells: string[], several: boolean): string[] => {
  const found = new Map<string, string>();
  for (const cell of cells) {
    for (const part of several ? cell.split(ANSWER_SEPARATOR) : [cell]) {
      const answer = part.trim().slice(0, MAX_OPTION_LENGTH);
      const seen = answer.toLowerCase();
      if (answer && !found.has(seen)) {
        found.set(seen, answer);
        if (found.size > MAX_SUGGESTED_OPTIONS) {
          return [];
        }
      }
    }
  }
  return [...found.values()];
};
