import { matchShape, optionText } from '@tryghost/metafield-types/structure';
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
