import { type CollectFormState, asksNoTier } from './collect-form';

/** Letting buyers give a tax ID, as it is edited. Stripe keeps it, so no field is chosen. */
export type TaxNumberFormState = CollectFormState;

export const TAX_NUMBER_ERRORS = ['taxNumberTiers'] as const;

/** What is wrong with the tax ID setting as it is edited, by the setting it is shown under. */
export type TaxNumberErrors = Partial<Record<(typeof TAX_NUMBER_ERRORS)[number], string>>;

/** What is missing before the tax ID setting can be saved, by error key. */
export function validateTaxNumber(state: TaxNumberFormState): TaxNumberErrors {
  return asksNoTier(state) ? { taxNumberTiers: 'Choose at least one tier' } : {};
}
