import React, { useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  CommandCheck,
  CommandItem,
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldTitle,
  MultiSelectCombobox,
  Switch,
} from '@tryghost/shade/components';
import { ArchivedBadge } from '@/shared/archived-badge';
import { CustomFieldPicker } from '@/shared/member-custom-fields/custom-field-picker';
import {
  type MemberCustomField,
  creatableTypesAmong,
  useCreatableMemberCustomFieldTypes,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import { type CollectFormState, tierChoiceOf } from './collect-form';

/**
 * A setting under the switch: its name on the left, a fixed-width control on the right. The name
 * is a title, not a label, so clicking it never opens the control, and the control carries the
 * name itself.
 */
export const SubRow: React.FC<{
  label: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, error, children }) => (
  <Field data-invalid={Boolean(error) || undefined} orientation="horizontal">
    <FieldTitle className="h-(--control-height) shrink-0 font-normal">{label}</FieldTitle>
    <FieldContent className="w-[200px] flex-none">
      {children}
      {error && <FieldError>{error}</FieldError>}
    </FieldContent>
  </Field>
);

export const MultiPicker: React.FC<{
  label: string;
  searchPlaceholder: string;
  /** Each option, and whether it's archived, which shows as a badge on the picker and its row. */
  options: Array<{ value: string; label: string; archived?: boolean }>;
  values: string[];
  /** Shown while nothing is chosen, as a placeholder. */
  empty: string;
  /** Shown instead of the chosen labels, such as when every option is chosen. */
  summary?: string;
  invalid?: boolean;
  onChange: (values: string[]) => void;
}> = ({ label, searchPlaceholder, options, values, empty, summary, invalid, onChange }) => {
  const [open, setOpen] = useState(false);
  const chosen = options.filter((option) => values.includes(option.value));
  const chosenArchived = chosen.filter((option) => option.archived);
  const shown =
    summary ??
    (chosen.length
      ? chosen.map((option) => option.label).join(', ')
      : // Chosen values the list no longer offers still count.
        values.length
        ? `${values.length} unavailable`
        : empty);
  // The list searches an archived option as "Name (archived)", as it was labelled before it had a
  // badge, so it's still found that way and told apart from an active one with the same name.
  const archived = new Set(options.filter((option) => option.archived).map(({ value }) => value));
  const names = new Map(options.map((option) => [option.value, option.label]));
  return (
    // Modal, like a select, so clicking away only closes it. The rows sit close together, and the
    // click would otherwise go on to whatever it lands on, such as switching a part off.
    <Combobox open={open} modal onOpenChange={setOpen}>
      <ComboboxTrigger aria-invalid={invalid || undefined} aria-label={label}>
        <ComboboxValue placeholder={!values.length}>
          {!summary && chosenArchived.length ? (
            // One line, cut off when long, with the archived options first, then one badge that
            // always shows: "Archived" for a single choice, or how many of several are. The list
            // says which.
            <span className="flex items-center gap-2">
              <span className="truncate">
                {[...chosenArchived, ...chosen.filter((option) => !option.archived)]
                  .map((option) => option.label)
                  .join(', ')}
              </span>
              <ArchivedBadge>
                {chosen.length === 1 ? 'Archived' : `${chosenArchived.length} archived`}
              </ArchivedBadge>
            </span>
          ) : (
            shown
          )}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <MultiSelectCombobox
          i18n={{ searchPlaceholder }}
          options={
            archived.size
              ? options.map((option) =>
                  option.archived ? { ...option, label: `${option.label} (archived)` } : option,
                )
              : options
          }
          // Its own row only where an option is archived, with the badge after the name; every
          // other list keeps the default row.
          renderItem={
            archived.size
              ? ({ option, isSelected, onSelect }) => (
                  <CommandItem key={option.value} value={option.label} onSelect={onSelect}>
                    <span
                      className="truncate text-accent-foreground"
                      title={names.get(option.value)}
                    >
                      {names.get(option.value)}
                    </span>
                    {archived.has(option.value) && <ArchivedBadge />}
                    <CommandCheck className={isSelected ? undefined : 'opacity-0'} />
                  </CommandItem>
                )
              : undefined
          }
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
  /** The name a field created here starts with. */
  suggestedName?: string;
  onChange: (key: string) => void;
}> = ({ label, type, fields, chosen, value, error, suggestedName, onChange }) => {
  const creatableTypes = useCreatableMemberCustomFieldTypes();
  // Ghost refuses a name another field has, in any case, archived or not, so a taken name isn't
  // suggested: the form starts empty instead of with a name that can't be saved.
  const nameIsFree =
    suggestedName !== undefined &&
    !fields.some((field) => field.name.toLowerCase() === suggestedName.toLowerCase());
  return (
    <SubRow error={error} label={label}>
      <CustomFieldPicker
        // Offered without asking about the custom fields flag or host limit. Checkout collection
        // is released with custom fields, and it needs Stripe, which a host only lets a site
        // connect where it lets it have custom fields. A site that loses them keeps its
        // connection, and the server refuses a new field there with the host's message, which
        // the picker shows. A type still in development is offered where its own flag is on.
        createTypes={creatableTypesAmong(creatableTypes, [type])}
        // A field archived after it was chosen stays chosen, so the setting can be saved back.
        fields={fields.filter(
          (field) =>
            field.key === value ||
            (field.type === type && field.status === 'active' && !chosen.includes(field.key)),
        )}
        invalid={Boolean(error)}
        label={label}
        suggestedName={nameIsFree ? suggestedName : undefined}
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
  state: CollectFormState;
  /** Paid tiers, archived ones included. */
  tiers: Tier[];
  tiersError?: string;
  onChange: (next: CollectFormState) => void;
  children?: React.ReactNode;
}> = ({ id, label, state, tiers, tiersError, onChange, children }) => {
  const set = (next: Partial<CollectFormState>) => onChange({ ...state, ...next });
  const activeTierIds = tiers.filter((tier) => tier.active).map((tier) => tier.id);

  return (
    // A group named by the part, so its "Collect for" and other settings are told apart from
    // another part's.
    <div aria-labelledby={`${id}-label`} className="flex flex-col gap-3" role="group">
      <Field orientation="horizontal">
        <FieldLabel htmlFor={id} id={`${id}-label`}>
          {label}
        </FieldLabel>
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
                .map((tier) => ({ value: tier.id, label: tier.name, archived: !tier.active }))}
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
