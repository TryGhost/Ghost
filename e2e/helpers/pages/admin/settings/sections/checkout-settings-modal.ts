import { FakeStripeCheckoutPage } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';

export type CheckoutCorners = 'Squared' | 'Rounded' | 'Pill';

/** A custom field a collected value is saved into: chosen, or created when it's new. */
type FieldChoice = { choose: string } | { create: string };

/** How checkout collects a shipping address. */
export interface ShippingChoice {
  /** Left out, every paid tier asks, including tiers added later. */
  tiers?: string[];
  /** Left out, Stripe ships everywhere. Named as the countries picker lists them. */
  countries?: string[];
  addressField: FieldChoice;
  nameField: FieldChoice;
}

/** How checkout collects a phone number. */
export interface PhoneChoice {
  /** Left out, every paid tier asks, including tiers added later. */
  tiers?: string[];
  field: FieldChoice;
}

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
  readonly previewInStripeButton: Locator;
  readonly saveButton: Locator;
  readonly savedButton: Locator;
  readonly closeButton: Locator;
  readonly unsavedChangesDialog: Locator;
  readonly designTab: Locator;
  readonly fieldsTab: Locator;
  readonly shippingSwitch: Locator;
  readonly shippingTiersPicker: Locator;
  readonly shipsToSelect: Locator;
  readonly countriesPicker: Locator;
  readonly addressFieldPicker: Locator;
  readonly nameFieldPicker: Locator;
  readonly previewShipping: Locator;
  readonly phoneSwitch: Locator;
  readonly phoneTiersPicker: Locator;
  readonly phoneFieldPicker: Locator;
  readonly previewPhone: Locator;
  readonly taxIdSwitch: Locator;
  readonly taxIdTiersPicker: Locator;
  readonly previewTaxId: Locator;

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
    this.previewInStripeButton = this.modal.getByRole('button', { name: 'Preview in Stripe' });
    this.saveButton = this.modal.getByRole('button', { name: 'Save' });
    this.savedButton = this.modal.getByRole('button', { name: 'Saved' });
    this.closeButton = this.modal.getByRole('button', { name: 'Close' });
    this.unsavedChangesDialog = page.getByRole('alertdialog', {
      name: 'Are you sure you want to leave this page?',
    });
    this.designTab = this.modal.getByRole('tab', { name: 'Design' });
    this.fieldsTab = this.modal.getByRole('tab', { name: 'Fields' });
    this.shippingSwitch = this.modal.getByRole('switch', { name: 'Shipping address' });
    // Each part has its own "Collect for", inside the group its switch names.
    this.shippingTiersPicker = this.modal
      .getByRole('group', { name: 'Shipping address' })
      .getByRole('combobox', { name: 'Collect for' });
    this.shipsToSelect = this.modal.getByRole('combobox', { name: 'Ships to' });
    this.countriesPicker = this.modal.getByRole('combobox', { name: 'Countries' });
    this.addressFieldPicker = this.modal.getByRole('combobox', { name: 'Save address as' });
    this.nameFieldPicker = this.modal.getByRole('combobox', { name: 'Save name as' });
    this.previewShipping = this.preview.getByText('Shipping address', { exact: true });
    this.phoneSwitch = this.modal.getByRole('switch', { name: 'Phone', exact: true });
    this.phoneTiersPicker = this.modal
      .getByRole('group', { name: 'Phone', exact: true })
      .getByRole('combobox', { name: 'Collect for' });
    this.phoneFieldPicker = this.modal.getByRole('combobox', { name: 'Save phone as' });
    this.previewPhone = this.preview.getByText('Phone', { exact: true });
    this.taxIdSwitch = this.modal.getByRole('switch', { name: 'Tax ID or VAT' });
    this.taxIdTiersPicker = this.modal
      .getByRole('group', { name: 'Tax ID or VAT' })
      .getByRole('combobox', { name: 'Collect for' });
    this.previewTaxId = this.preview.getByText("I'm purchasing as a business");
  }

  /** The tiers the sketch tags a collected part with, when it's limited to some. */
  previewTierTag(text: string): Locator {
    return this.preview.getByText(text, { exact: true });
  }

  fieldError(message: string): Locator {
    return this.modal.getByText(message, { exact: true });
  }

  async openFieldsTab(): Promise<void> {
    await this.fieldsTab.click();
  }

  async collectShipping(choice: ShippingChoice): Promise<void> {
    await this.shippingSwitch.setChecked(true);
    if (choice.tiers) {
      await this.limitTiers(this.shippingTiersPicker, choice.tiers);
    }
    if (choice.countries) {
      await this.chooseOption(this.shipsToSelect, 'Specific countries');
      await this.pickMany(this.countriesPicker, choice.countries);
    }
    await this.setDestination(this.addressFieldPicker, 'Save address as', choice.addressField);
    await this.setDestination(this.nameFieldPicker, 'Save name as', choice.nameField);
  }

  async collectPhone(choice: PhoneChoice): Promise<void> {
    await this.phoneSwitch.setChecked(true);
    if (choice.tiers) {
      await this.limitTiers(this.phoneTiersPicker, choice.tiers);
    }
    await this.setDestination(this.phoneFieldPicker, 'Save phone as', choice.field);
  }

  /** Lets business buyers give a tax ID on these tiers or, left out, on every paid tier. */
  async collectTaxId(tiers?: string[]): Promise<void> {
    await this.taxIdSwitch.setChecked(true);
    if (tiers) {
      await this.limitTiers(this.taxIdTiersPicker, tiers);
    }
  }

  /** Unticks every tier but these, from the default of every paid tier ticked. */
  private async limitTiers(picker: Locator, names: string[]): Promise<void> {
    await picker.click();
    // allTextContents() doesn't wait, so wait for the list before reading it.
    await this.page.getByRole('option').first().waitFor();
    const ticked = await this.page.getByRole('option').allTextContents();
    for (const name of ticked.filter((tier) => !names.includes(tier))) {
      await this.page.getByRole('option', { name, exact: true }).click();
    }
    await this.page.keyboard.press('Escape');
  }

  private async chooseOption(select: Locator, name: string): Promise<void> {
    await select.click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  private async pickMany(picker: Locator, names: string[]): Promise<void> {
    await picker.click();
    for (const name of names) {
      await this.page.getByRole('option', { name, exact: true }).click();
    }
    await this.page.keyboard.press('Escape');
  }

  private async setDestination(picker: Locator, label: string, field: FieldChoice): Promise<void> {
    await picker.click();
    if ('choose' in field) {
      await this.page.getByRole('option', { name: field.choose, exact: true }).click();
      return;
    }
    await this.page.getByRole('option', { name: 'Add custom field' }).click();
    await this.page
      .getByRole('textbox', { name: `New custom field for ${label}` })
      .fill(field.create);
    // The open picker hides the rest of the page, so its Save is the only one to be found.
    await this.page.getByRole('button', { name: 'Save', exact: true }).click();
    await picker.filter({ hasText: field.create }).waitFor();
  }

  corners(name: CheckoutCorners): Locator {
    return this.cornersGroup.getByRole('radio', { name });
  }

  /** The business name the sketch shows at the top of the checkout. */
  previewBusinessName(name: string): Locator {
    return this.preview.getByText(name, { exact: true });
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

  previewTierOption(tierName: string): Locator {
    return this.page.getByRole('menuitem', { name: tierName, exact: true });
  }

  /** Opens the tier's Stripe Checkout preview, which loads in a new tab, and returns that tab. */
  async previewInStripe(tierName: string): Promise<Page> {
    await this.previewInStripeButton.click();
    const popup = this.page.waitForEvent('popup');
    await this.previewTierOption(tierName).click();
    const tab = await popup;
    await new FakeStripeCheckoutPage(tab).waitUntilLoaded();
    return tab;
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
