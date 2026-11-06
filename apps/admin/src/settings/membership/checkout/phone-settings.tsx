import React from 'react';
import { PORT_FIELD, STRIPE_PORT } from '@tryghost/checkout';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import { CollectRow, Destination } from './collect-settings';
import type { PhoneErrors, PhoneFormState } from './phone-form';

/**
 * Collecting a phone number at checkout: which paid tiers ask for it, and the custom field it
 * is saved into.
 */
const PhoneSettings: React.FC<{
  state: PhoneFormState;
  /** Paid tiers, archived ones included. */
  tiers: Tier[];
  fields: MemberCustomField[];
  /** The fields chosen for every collected value, which no other value is offered. */
  chosenFields: Array<string | null>;
  errors: PhoneErrors;
  /** Whether every checkout asks for it, whatever this says. */
  alwaysAsked: boolean;
  onChange: (next: PhoneFormState) => void;
}> = ({ state, tiers, fields, chosenFields, errors, alwaysAsked, onChange }) => {
  const set = (next: Partial<PhoneFormState>) => onChange({ ...state, ...next });

  return (
    <CollectRow
      alwaysAsked={alwaysAsked}
      id="checkout-collect-phone"
      label="Phone"
      state={state}
      tiers={tiers}
      tiersError={errors.phoneTiers}
      onChange={set}
    >
      <Destination
        chosen={chosenFields}
        error={errors.phoneField}
        fields={fields}
        label="Save phone as"
        type={PORT_FIELD[STRIPE_PORT.phone].type}
        value={state.fieldKey}
        onChange={(fieldKey) => set({ fieldKey })}
      />
    </CollectRow>
  );
};

export default PhoneSettings;
