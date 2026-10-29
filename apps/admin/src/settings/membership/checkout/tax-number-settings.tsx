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
  /** Whether every checkout offers it whatever this says, which only automatic tax does. */
  alwaysAsked: boolean;
  errors: TaxNumberErrors;
  onChange: (next: TaxNumberFormState) => void;
}> = ({ state, tiers, alwaysAsked, errors, onChange }) => (
  <CollectRow
    alwaysAsked={alwaysAsked}
    // Unlike the other parts there's no field to choose, and Stripe leaves the option out for some
    // buyers, so a publisher checking from the US would otherwise see no change at all.
    description={{
      text: alwaysAsked
        ? 'Stripe Automatic Tax already asks for it on all paid tiers, in countries Stripe supports.'
        : 'Business buyers can add a tax ID to their invoices, in countries Stripe supports.',
      // Stripe's own docs say which buyers it asks, and stay current as that changes.
      learnMoreUrl: 'https://docs.stripe.com/tax/checkout/tax-ids',
    }}
    id="checkout-collect-tax-number"
    label="Tax ID or VAT"
    state={state}
    tiers={tiers}
    tiersError={errors.taxNumberTiers}
    onChange={onChange}
  />
);

export default TaxNumberSettings;
