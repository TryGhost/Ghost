import { page } from 'vitest/browser';
import {
  addCustomFieldOption,
  csvDropzoneText,
  fieldForColumnPrefix,
  importColumnTogglePrefix,
  importCompleteText,
  importCreateCustomField,
  importLeaveConfirmationText,
  searchFieldsPlaceholder,
} from '@tryghost/test-data/selectors/members';

/** Import-members modal locators and gestures for acceptance specs; no assertions. */
export const importMembersScreen = {
  dropzone: () => page.getByRole('button', { name: new RegExp(csvDropzoneText, 'i') }),

  /** The dropzone's visually hidden file input — no accessible locator reaches it. */
  fileInput: () => {
    const input = importMembersScreen.dropzone().element().querySelector('input[type=file]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('CSV upload input was not rendered');
    }
    return page.elementLocator(input);
  },

  importToggle: (column: string) =>
    page.getByRole('checkbox', { name: `${importColumnTogglePrefix}${column}` }),
  fieldSelect: (column: string) =>
    page.getByRole('combobox', { name: `${fieldForColumnPrefix}${column}` }),
  createFieldForm: () => page.getByTestId(importCreateCustomField),
  searchFieldsInput: () => page.getByPlaceholder(searchFieldsPlaceholder),
  option: (name: string | RegExp, options?: { exact?: boolean }) =>
    page.getByRole('option', { name, ...options }),
  addCustomFieldOption: () => page.getByRole('option', { name: addCustomFieldOption }),
  importButton: (memberCount: number) =>
    page.getByRole('button', {
      name: `Import ${memberCount} member${memberCount === 1 ? '' : 's'}`,
    }),

  /** A result or refusal message as the modal surfaces it; copy comes from the spec's fixtures. */
  messageText: (text: string | RegExp) => page.getByText(text),
  importCompleteText: () => page.getByText(importCompleteText),
  tryAgainButton: () => page.getByRole('button', { name: /Try again/ }),

  leaveConfirmationText: () => page.getByText(importLeaveConfirmationText),
  keepMappingButton: () => page.getByRole('button', { name: 'Keep mapping' }),
  leaveButton: () => page.getByRole('button', { name: 'Leave' }),
};
