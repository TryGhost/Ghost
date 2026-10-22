import React, { useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  MultiSelectCombobox,
  Switch,
} from '@tryghost/shade/components';
import { CustomFieldPicker } from '@/shared/member-custom-fields/custom-field-picker';
import {
  useCanCreateCustomFields,
  useCustomFieldsPlanNotice,
} from '@/shared/member-custom-fields/availability';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import { type CollectFormState, tierChoiceOf } from './collect-form';

/** A setting under the switch: label on the left, a fixed-width control on the right. */
export const SubRow: React.FC<{
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, error, children }) => (
  <Field data-invalid={Boolean(error) || undefined} orientation="horizontal">
    <FieldLabel
      className="h-(--control-height) shrink-0 items-center font-normal"
      htmlFor={htmlFor}
    >
      {label}
    </FieldLabel>
    <FieldContent className="w-[200px] flex-none">
      {children}
      {error && <FieldError>{error}</FieldError>}
    </FieldContent>
  </Field>
);

export const MultiPicker: React.FC<{
  id?: string;
  label: string;
  searchPlaceholder: string;
  options: Array<{ value: string; label: string }>;
  values: string[];
  /** Shown while nothing is chosen, as a placeholder. */
  empty: string;
  /** Shown instead of the chosen labels, such as when every option is chosen. */
  summary?: string;
  invalid?: boolean;
  onChange: (values: string[]) => void;
}> = ({ id, label, searchPlaceholder, options, values, empty, summary, invalid, onChange }) => {
  const [open, setOpen] = useState(false);
  const chosen = options.filter((option) => values.includes(option.value));
  const shown =
    summary ??
    (chosen.length
      ? chosen.map((option) => option.label).join(', ')
      : // Chosen values the list no longer offers still count.
        values.length
        ? `${values.length} unavailable`
        : empty);
  return (
    <Combobox open={open} onOpenChange={setOpen}>
      <ComboboxTrigger aria-invalid={invalid || undefined} aria-label={label} id={id}>
        <ComboboxValue placeholder={!values.length}>{shown}</ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <MultiSelectCombobox
          i18n={{ searchPlaceholder }}
          options={options}
          values={values}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      </ComboboxContent>
    </Combobox>
  );
};

/** The custom field a collected value is saved into, of the one type that can hold it. */
export const Destination: React.FC<{
  id: string;
  label: string;
  type: MemberCustomField['type'];
  fields: MemberCustomField[];
  /**
   * The fields chosen for every collected value. Another value's field isn't offered, as the
   * two would overwrite each other on every checkout.
   */
  chosen: Array<string | null>;
  value: string | null;
  error?: string;
  onChange: (key: string) => void;
}> = ({ id, label, type, fields, chosen, value, error, onChange }) => {
  // On a plan without custom fields every field reads as archived, so the list holds at most
  // the one already chosen, and the server would refuse a new one.
  const canCreate = useCanCreateCustomFields();
  const planNotice = useCustomFieldsPlanNotice();

  return (
    <SubRow error={error} htmlFor={id} label={label}>
      <CustomFieldPicker
        createTypes={canCreate ? [type] : undefined}
        // A field archived after it was chosen stays chosen, so the setting can be saved back.
        fields={fields.filter(
          (field) =>
            field.key === value ||
            (field.type === type && field.status === 'active' && !chosen.includes(field.key)),
        )}
        id={id}
        invalid={Boolean(error)}
        label={label}
        notice={planNotice}
        value={value}
        onChange={onChange}
      />
    </SubRow>
  );
};

/**
 * A part checkout can ask for: a switch, and while it's on, the paid tiers that ask for it
 * followed by the part's own settings, if it has any.
 */
export const CollectRow: React.FC<{
  id: string;
  label: string;
  /** Shown under the label. */
  description?: string;
  state: CollectFormState;
  /** Paid tiers, archived ones included. */
  tiers: Tier[];
  tiersError?: string;
  onChange: (next: CollectFormState) => void;
  children?: React.ReactNode;
}> = ({ id, label, description, state, tiers, tiersError, onChange, children }) => {
  const set = (next: Partial<CollectFormState>) => onChange({ ...state, ...next });
  const activeTierIds = tiers.filter((tier) => tier.active).map((tier) => tier.id);
  const labelled = (
    <FieldLabel htmlFor={id} id={`${id}-label`}>
      {label}
    </FieldLabel>
  );

  return (
    // A group named by the part, so its "Collect for" and other settings are told apart from
    // another part's.
    <div aria-labelledby={`${id}-label`} className="flex flex-col gap-3" role="group">
      <Field orientation="horizontal">
        {description ? (
          <FieldContent>
            {labelled}
            <FieldDescription>{description}</FieldDescription>
          </FieldContent>
        ) : (
          labelled
        )}
        <Switch checked={state.collect} id={id} onCheckedChange={(collect) => set({ collect })} />
      </Field>
      {state.collect && (
        <>
          <SubRow error={tiersError} label="Collect for">
            <MultiPicker
              empty="No tiers"
              invalid={Boolean(tiersError)}
              label="Collect for"
              // An archived tier stays listed while it's chosen, so it can be unticked.
              options={tiers
                .filter(
                  (tier) => tier.active || (!state.allTiers && state.tierIds.includes(tier.id)),
                )
                .map((tier) => ({
                  value: tier.id,
                  label: tier.active ? tier.name : `${tier.name} (archived)`,
                }))}
              searchPlaceholder="Search tiers..."
              summary={state.allTiers ? 'All paid tiers' : undefined}
              values={state.allTiers ? activeTierIds : state.tierIds}
              onChange={(tierIds) => set(tierChoiceOf(tierIds, activeTierIds))}
            />
          </SubRow>
          {children}
        </>
      )}
    </div>
  );
};
