/**
 * An option as the editor holds it. Its text can change while it's typed, so the row has its own
 * id for React and for dragging.
 */
export interface OptionRow {
  readonly id: string;
  readonly text: string;
  /**
   * Saved with the field, so its text is fixed, as the field's type is. An option's text is all
   * that names it, so different text is a different option, and members who picked the old text
   * would keep it.
   */
  readonly saved: boolean;
}

let lastRowId = 0;

/** A row for an option's text, saved with the field or not. */
export const optionRow = (text: string, saved = false): OptionRow => {
  lastRowId += 1;
  return { id: `option-${lastRowId}`, text, saved };
};
