import { MAX_OPTIONS, matchShape, optionText } from '@tryghost/metafield-types/structure';
import { splitListCell } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { FieldType, TypedSettings } from '@tryghost/metafield-types';

/** A list's options as a form holds them, with what is typed but not yet added among them. */
export const listSettings = (state: {
  options: string[];
  newOption: string;
  multiple: boolean;
}) => {
  const typed = optionText(state.newOption);
  return {
    options:
      typed === '' || state.options.includes(typed) ? state.options : [...state.options, typed],
    multiple: state.multiple,
  };
};

/** The type chosen, with the settings that type takes: a list's options, or none. */
export const typedSettings = (
  type: FieldType,
  settings: { options: string[]; multiple: boolean },
): TypedSettings =>
  matchShape<TypedSettings>(type, {
    scalar: (_structure, scalarType) => ({ type: scalarType, settings: null }),
    record: (_structure, recordType) => ({ type: recordType, settings: null }),
    set: (_structure, setType) => ({ type: setType, settings }),
  });

/**
 * The options a CSV column's cells suggest for a list made from it: every different answer once,
 * in the order they first appear, split where a cell holds several the way the import reads them,
 * and none at all past the most a list can offer, when the column reads as free text. Several
 * answers are suggested when any cell holds more than one.
 */
export function suggestedListSettings(cells: readonly string[]): {
  options: string[];
  multiple: boolean;
} {
  const found = new Set<string>();
  let multiple = false;
  for (const cell of cells) {
    const answers = splitListCell(cell).map(optionText);
    multiple ||= answers.length > 1;
    for (const answer of answers) {
      found.add(answer);
      if (found.size > MAX_OPTIONS) {
        return { options: [], multiple };
      }
    }
  }
  return { options: [...found], multiple };
}
