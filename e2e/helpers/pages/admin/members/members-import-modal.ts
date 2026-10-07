import { Locator, Page } from '@playwright/test';

export class MembersImportModal {
  private readonly page: Page;
  private readonly dialog: Locator;

  readonly fileInput: Locator;
  readonly importButton: Locator;
  readonly importHeading: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog');
    this.fileInput = this.dialog.locator('input[type="file"]').first();
    this.importButton = this.dialog.getByRole('button', {
      name: /^Import(?: \d[\d,]* members?)?$/,
    });
    this.importHeading = this.dialog.getByRole('heading', {
      name: /import (in progress|complete)/i,
    });
    this.closeButton = this.dialog.getByRole('button', { name: /^(View members|Got it)$/ });
  }

  getMappingRow(fieldName: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell', { name: fieldName, exact: true }),
    });
  }

  getMappingValue(fieldName: string): Locator {
    return this.getMappingRow(fieldName).getByRole('combobox');
  }

  // Whether a column is part of the import. Behind the custom fields flag this is a
  // checkbox of its own; the control that names the target says nothing about it.
  getIncludeCheckbox(csvColumn: string): Locator {
    return this.getMappingRow(csvColumn).getByRole('checkbox');
  }

  // Point a CSV column at a target field: open its "Import as" select and pick an option
  // (a core field or a defined custom field, by its label).
  //
  // A column no field matched starts out of the import behind the custom fields flag, and
  // its target control appears only once it is brought in — so bring it in first if it is
  // not already. Without the flag the checkbox is absent and the control is always there.
  async setMappingTarget(csvColumn: string, targetLabel: string): Promise<void> {
    const include = this.getIncludeCheckbox(csvColumn);
    if ((await include.count()) > 0 && !(await include.isChecked())) {
      await include.check();
    }
    await this.getMappingValue(csvColumn).click();
    await this.page.getByRole('option', { name: targetLabel, exact: true }).click();
  }
}
