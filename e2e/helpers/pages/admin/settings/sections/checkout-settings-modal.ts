import { Locator, Page } from '@playwright/test';

export type CheckoutCorners = 'Squared' | 'Rounded' | 'Pill';

/** The Stripe Checkout settings, opened from the Tiers section of Settings. */
export class CheckoutSettingsModal {
  private readonly page: Page;

  readonly openButton: Locator;
  readonly modal: Locator;
  readonly customizeDesignSwitch: Locator;
  readonly backgroundColorButton: Locator;
  readonly accentColorButton: Locator;
  readonly hexColorInput: Locator;
  readonly cornersGroup: Locator;
  readonly fontSelect: Locator;
  readonly preview: Locator;
  readonly previewPayButton: Locator;
  readonly saveButton: Locator;
  readonly savedButton: Locator;
  readonly closeButton: Locator;
  readonly unsavedChangesDialog: Locator;

  constructor(page: Page) {
    this.page = page;

    this.openButton = page.getByRole('button', { name: 'Customize checkout' });
    this.modal = page.getByRole('region', { name: 'Checkout' });
    this.customizeDesignSwitch = this.modal.getByRole('switch', {
      name: 'Customize checkout design',
    });
    this.backgroundColorButton = this.modal.getByRole('button', { name: 'Background color' });
    this.accentColorButton = this.modal.getByRole('button', { name: 'Accent color' });
    // The color picker opens in a popover outside the modal.
    this.hexColorInput = page.getByRole('textbox', { name: 'Hex color' });
    this.cornersGroup = this.modal.getByRole('radiogroup', { name: 'Corners' });
    this.fontSelect = this.modal.getByRole('combobox', { name: 'Checkout font' });
    this.preview = this.modal.getByRole('figure', { name: 'Checkout preview' });
    this.previewPayButton = this.preview.getByText('Pay', { exact: true });
    this.saveButton = this.modal.getByRole('button', { name: 'Save' });
    this.savedButton = this.modal.getByRole('button', { name: 'Saved' });
    this.closeButton = this.modal.getByRole('button', { name: 'Close' });
    this.unsavedChangesDialog = page.getByRole('alertdialog', {
      name: 'Are you sure you want to leave this page?',
    });
  }

  corners(name: CheckoutCorners): Locator {
    return this.cornersGroup.getByRole('radio', { name });
  }

  async open(): Promise<void> {
    await this.openButton.click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async setCustomDesign(on: boolean): Promise<void> {
    await this.customizeDesignSwitch.setChecked(on);
  }

  async setBackgroundColor(hex: string): Promise<void> {
    await this.pickColor(this.backgroundColorButton, hex);
  }

  async setAccentColor(hex: string): Promise<void> {
    await this.pickColor(this.accentColorButton, hex);
  }

  /** Picks one of the swatches offered beside the accent color, such as "Site accent". */
  async chooseAccentSwatch(name: string): Promise<void> {
    await this.accentColorButton.click();
    await this.modal.getByRole('button', { name }).click();
    await this.hexColorInput.waitFor({ state: 'hidden' });
  }

  async chooseCorners(name: CheckoutCorners): Promise<void> {
    await this.corners(name).click();
  }

  async chooseFont(name: string): Promise<void> {
    await this.fontSelect.click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await this.savedButton.waitFor({ state: 'visible' });
  }

  async saveWithKeyboardShortcut(): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+s');
    await this.savedButton.waitFor({ state: 'visible' });
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  /** Closes with unsaved changes, answering the prompt that asks whether to leave. */
  async closeAndLeave(): Promise<void> {
    await this.closeButton.click();
    await this.unsavedChangesDialog.getByRole('button', { name: 'Leave' }).click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  /** Tries to close with unsaved changes, and stays when asked. */
  async closeAndStay(): Promise<void> {
    await this.closeButton.click();
    await this.unsavedChangesDialog.getByRole('button', { name: 'Stay' }).click();
    await this.unsavedChangesDialog.waitFor({ state: 'hidden' });
  }

  private async pickColor(trigger: Locator, hex: string): Promise<void> {
    await trigger.click();
    await this.hexColorInput.fill(hex);
    await this.page.keyboard.press('Escape');
    await this.hexColorInput.waitFor({ state: 'hidden' });
  }
}
