import { createContext, useContext } from 'react';
import type { FieldType } from '@tryghost/metafield-types/structure';
import type {
  CustomFieldErrors,
  CustomFieldValues,
} from '@/shared/member-custom-fields/custom-field-values';
import type { ListInputs } from '@/shared/member-custom-fields/list-inputs';
import type { MemberCustomFieldAccess } from '@tryghost/admin-x-framework/api/member-custom-fields';

/**
 * A custom field form's state, as the place that holds it gives it: the values, the problems to
 * show, and whether a save is in flight. The place decides how the state is kept and saved, and
 * the form's parts read and change it only through this.
 */
export interface CustomFieldFormState {
  readonly values: CustomFieldValues;
  readonly errors: CustomFieldErrors;
  readonly saving: boolean;
  /** Applies a change to the values as they stand when it applies. */
  readonly update: (change: (values: CustomFieldValues) => CustomFieldValues) => void;
  readonly setErrors: (change: (errors: CustomFieldErrors) => CustomFieldErrors) => void;
}

/** What the form's parts read and change, each change clearing the problems it answers. */
export interface CustomFieldFormParts {
  readonly values: CustomFieldValues;
  readonly errors: CustomFieldErrors;
  readonly idPrefix: string;
  readonly setName: (name: string) => void;
  readonly setType: (type: FieldType) => void;
  readonly changeList: (change: (list: ListInputs) => ListInputs) => void;
  readonly setAccess: (access: MemberCustomFieldAccess) => void;
}

export const CustomFieldFormContext = createContext<CustomFieldFormParts | null>(null);

/** The form the part is inside. A part of a custom field form is only ever drawn inside one. */
export function useCustomFieldForm(): CustomFieldFormParts {
  const parts = useContext(CustomFieldFormContext);
  if (!parts) {
    throw new Error('A custom field form part must be inside a CustomFieldForm');
  }
  return parts;
}
