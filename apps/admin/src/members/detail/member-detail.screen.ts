import { page } from 'vitest/browser';
import {
  editFieldButtonPrefix,
  memberCustomFieldEditModal,
  memberCustomFieldsField,
  memberDetail,
} from '@tryghost/test-data/selectors/members';

/** Member detail screen locators and gestures for acceptance specs; no assertions. */
export const memberDetailScreen = {
  detail: () => page.getByTestId(memberDetail),
  nameInput: () => page.getByLabelText('Name'),
  saveButton: () => memberDetailScreen.detail().getByRole('button', { name: 'Save', exact: true }),
  backLink: () => memberDetailScreen.detail().getByRole('link', { name: 'Members' }),

  customFieldsSection: () => page.getByTestId(memberCustomFieldsField),
  /** A read-only value as the record renders it (addresses as one line). */
  /** Exact: a row that kept a cleared part would still contain the shorter text. */
  fieldValue: (text: string) => page.getByText(text, { exact: true }),
  /** The dash an empty custom-field row shows. */
  emptyValueDash: () => page.getByText('–').first(),
  editFieldButton: (fieldName: string) =>
    page.getByRole('button', { name: `${editFieldButtonPrefix}${fieldName}` }),
  fieldEditModal: () => page.getByTestId(memberCustomFieldEditModal),
  /** An editable input for a custom field — the record itself never renders one. */
  fieldTextbox: (fieldName: string) => page.getByRole('textbox', { name: fieldName }),

  // The unsaved-changes guard dialog and its actions.
  leaveConfirmationText: () => page.getByText('Are you sure you want to leave this page?'),
  stayButton: () => page.getByRole('button', { name: 'Stay' }),
  leaveButton: () => page.getByRole('button', { name: 'Leave' }),
};
