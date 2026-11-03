import ListFieldSettings from '@/shared/member-custom-fields/list-field-settings';
import { CustomFieldTypeOption } from '@/shared/member-custom-fields/custom-field-type-option';
import {
  type CustomFieldDraft,
  type CustomFieldDraftErrors,
  defaultTypedSettings,
  isSettingsProblem,
} from '@/shared/member-custom-fields/custom-field-draft';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@tryghost/shade/components';
import { formatNumber } from '@tryghost/shade/utils';
import { matchField, type SetSettings } from '@tryghost/metafield-types/structure';
import { useMemberCount } from '@tryghost/admin-x-framework/api/members';
import type { ReactNode } from 'react';
import type {
  MemberCustomField,
  MemberCustomFieldUserType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

/**
 * Whether members can see a field, with what that means for this field spelled out. Its own
 * component so the member count it reads is only asked for where the question is.
 */
function VisibilityField({
  access,
  field,
  idPrefix,
  saving,
  onChange,
}: {
  access: CustomFieldDraft['access'];
  field?: MemberCustomField;
  idPrefix: string;
  saving: boolean;
  onChange: (access: CustomFieldDraft['access']) => void;
}) {
  const memberCount = useMemberCount();
  const isArchived = field?.status === 'archived';

  // The API keeps a third access level, `read`, that the switch doesn't offer. A field
  // already set to it reads as open and is described as such; saving without touching
  // the switch leaves it there, since the edit sends only what changed, and switching it
  // off and on again returns it to the level it had rather than upgrading it.
  const isOpenToMembers = access !== 'none';
  const storedOpenLevel = field && field.access.member !== 'none' ? field.access.member : 'write';
  // Opening a field that was closed discloses whatever staff have recorded in it so far.
  const isOpeningClosedField =
    field !== undefined && isOpenToMembers && field.access.member === 'none';

  let description;
  if (isArchived) {
    description =
      'Members never see an archived field. Reactivate it to choose whether they can see this one.';
  } else if (isOpenToMembers) {
    // The count is left out while it loads, as the newsletter modal does.
    const members = `Your ${memberCount === undefined ? '' : formatNumber(memberCount)} member${memberCount === 1 ? '' : 's'}`;
    description =
      access === 'read'
        ? `${members} can see this field in their Portal account settings, but not change it.`
        : `${members} can see and update this field in their Portal account settings.`;
  } else {
    description = 'Only staff can see this field and what you record in it.';
  }

  return (
    <Field data-disabled={isArchived || undefined} orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={`${idPrefix}-visible-to-members`}>Visible to members</FieldLabel>
        <FieldDescription>
          {description}
          {isOpeningClosedField && <> Anything already recorded will become visible.</>}
        </FieldDescription>
      </FieldContent>
      <Switch
        checked={!isArchived && isOpenToMembers}
        data-testid="custom-field-access"
        disabled={isArchived || saving}
        id={`${idPrefix}-visible-to-members`}
        onCheckedChange={(checked) => onChange(checked ? storedOpenLevel : 'none')}
      />
    </Field>
  );
}

/** A list field's settings as saved, or undefined for a field that isn't a list. */
const savedListSettings = (field: MemberCustomField): SetSettings | undefined =>
  matchField<MemberCustomField, SetSettings | undefined>(field, {
    scalar: () => undefined,
    record: () => undefined,
    set: ({ settings }) => settings,
  });

/**
 * The questions that make a custom field: its name, its type, what that type is set up with, and
 * whether members can see it. Shared by every place a field is created or edited, so each asks
 * them the same way; the place decides what surrounds the form and what saving does.
 */
export function CustomFieldForm({
  draft,
  field,
  errors = {},
  idPrefix,
  types,
  withVisibility = false,
  compact = false,
  disabled = false,
  saving = false,
  onChange,
  onClearErrors,
}: {
  draft: CustomFieldDraft;
  /** The field being edited. Its type is fixed, and its access shapes what the switch says. */
  field?: MemberCustomField;
  /** Problems to show, each under the input its path names. */
  errors?: CustomFieldDraftErrors;
  /** Prefixes the inputs' ids, so two forms on a page don't share them. */
  idPrefix: string;
  /** The types this place offers. One pins the type. */
  types: MemberCustomFieldUserType[];
  /**
   * Whether members' access is asked here. Off where a field is made in passing, since a new field
   * starts staff-only and is opened to members later, in Settings.
   */
  withVisibility?: boolean;
  /** Tighter spacing, for a popover. Settings' modal keeps its room. */
  compact?: boolean;
  /** Stops the settings changing, as an archived field's do. */
  disabled?: boolean;
  /**
   * Stops anything changing while a save is in flight, so a refusal that comes back still describes
   * what was sent.
   */
  saving?: boolean;
  /** Each change is made to the draft as it stands when it applies, so two in one event both land. */
  onChange: (update: (draft: CustomFieldDraft) => CustomFieldDraft) => void;
  /** Asks for the problems under the name, or under the settings, to be cleared. */
  onClearErrors: (which: 'name' | 'settings') => void;
}) {
  const isEdit = field !== undefined;
  // Shown even when it can't change, so what is being made is never a surprise.
  const typeFixed = isEdit || types.length === 1;
  // The settings' problems, by where they are within them, for the type's own inputs to place:
  // '' for the settings as a whole, `options.2` for a list's third option.
  const settingsErrors = Object.fromEntries(
    Object.entries(errors).flatMap(([property, message]) =>
      message && isSettingsProblem(property) ? [[property.slice('settings.'.length), message]] : [],
    ),
  );

  return (
    <FieldGroup className={compact ? 'gap-5' : 'gap-8'}>
      <Field data-invalid={Boolean(errors.name) || undefined}>
        <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
        <Input
          aria-invalid={Boolean(errors.name) || undefined}
          autoComplete="off"
          disabled={saving}
          id={`${idPrefix}-name`}
          placeholder="Enter custom field name"
          value={draft.name}
          autoFocus
          onChange={(e) => {
            onClearErrors('name');
            const name = e.target.value;
            onChange((current) => ({ ...current, name }));
          }}
        />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </Field>
      <Field data-disabled={typeFixed || undefined}>
        <FieldLabel>Type</FieldLabel>
        <Select
          disabled={typeFixed || saving}
          value={draft.type}
          onValueChange={(value) => {
            const chosen = types.find((userType) => userType.id === value);
            if (chosen) {
              // Settings belong to a type, so another type starts from its own defaults.
              onClearErrors('settings');
              onChange((current) => ({
                name: current.name,
                access: current.access,
                ...defaultTypedSettings(chosen.id),
              }));
            }
          }}
        >
          <SelectTrigger aria-label="Type" data-testid="custom-field-type">
            <SelectValue placeholder="Select type">
              <CustomFieldTypeOption type={draft.type} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {types.map((userType) => (
              <SelectItem key={userType.id} value={userType.id}>
                <CustomFieldTypeOption type={userType.id} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isEdit && <FieldDescription>Type can’t be changed after creation</FieldDescription>}
      </Field>
      {/* What the type is set up with, drawn by its shape, so a shape that takes settings can't
          be added without a way to set them. */}
      {matchField<CustomFieldDraft, ReactNode>(draft, {
        scalar: () => null,
        record: () => null,
        set: ({ type }) => (
          <ListFieldSettings
            // A new set of inputs for each type, since each starts from its own settings.
            key={type}
            disabled={disabled || saving}
            errors={settingsErrors}
            idPrefix={idPrefix}
            saved={field ? savedListSettings(field) : undefined}
            onChange={(settings) => {
              onClearErrors('settings');
              onChange((current) => ({ ...current, type, settings }));
            }}
          />
        ),
      })}
      {withVisibility && (
        <VisibilityField
          access={draft.access}
          field={field}
          idPrefix={idPrefix}
          saving={saving}
          onChange={(access) => onChange((current) => ({ ...current, access }))}
        />
      )}
    </FieldGroup>
  );
}
