import React from 'react';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import { CollectRow } from './collect-settings';
import type { TaxNumberErrors, TaxNumberFormState } from './tax-number-form';

/**
 * Letting business buyers give a tax ID at checkout: which paid tiers offer it. Stripe keeps the
 * tax ID on the customer and shows it on their invoices, so there is no field to choose.
 */
const TaxNumberSettings: React.FC<{
  state: TaxNumberFormState;
  /** Paid tiers, archived ones included. */
  tiers: Tier[];
  /** Whether automatic tax is on, which offers it on every checkout whatever this says. */
  automaticTax: boolean;
  errors: TaxNumberErrors;
  onChange: (next: TaxNumberFormState) => void;
}> = ({ state, tiers, automaticTax, errors, onChange }) => (
  <CollectRow
    description={
      automaticTax ? 'Stripe Automatic Tax already asks for it on every checkout' : undefined
    }
    id="checkout-collect-tax-number"
    label="Tax ID or VAT"
    state={state}
    tiers={tiers}
    tiersError={errors.taxNumberTiers}
    onChange={onChange}
  />
);

export default TaxNumberSettings;
