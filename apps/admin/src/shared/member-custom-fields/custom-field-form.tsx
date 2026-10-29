import ListOptionsEditor from '@/shared/member-custom-fields/list-options-editor';
import { CustomFieldTypeOption } from '@/shared/member-custom-fields/custom-field-type-option';
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
import {
  type CustomFieldDraft,
  type CustomFieldDraftErrors,
  emptyTypedSettings,
} from '@/shared/member-custom-fields/custom-field-draft';
import { type FieldOfShape, type FieldType, matchField } from '@tryghost/metafield-types/structure';
import { useState } from 'react';
import { useMemberCount } from '@tryghost/admin-x-framework/api/members';
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
  onChange,
}: {
  access: CustomFieldDraft['access'];
  field?: MemberCustomField;
  idPrefix: string;
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
        disabled={isArchived}
        id={`${idPrefix}-visible-to-members`}
        onCheckedChange={(checked) => onChange(checked ? storedOpenLevel : 'none')}
      />
    </Field>
  );
}

/**
 * The questions that make a custom field: its name, its type, a list's options, and whether
 * members can see it. Shared by every place a field is created or edited, so each asks them the
 * same way; the place decides what surrounds the form and what saving does.
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
  onChange,
  onClearError,
}: {
  draft: CustomFieldDraft;
  // The field being edited. Its type is fixed, and its access shapes what the switch says.
  field?: MemberCustomField;
  errors?: CustomFieldDraftErrors;
  idPrefix: string;
  // The types this place offers; one pins it.
  types: MemberCustomFieldUserType[];
  // Whether members' access is asked here. Off where a field is made in passing, since a new
  // field starts staff-only and is opened to members later, in Settings.
  withVisibility?: boolean;
  // Tighter spacing for a popover; Settings' modal keeps its room.
  compact?: boolean;
  // An archived field's settings, or a create in flight.
  disabled?: boolean;
  // Each change is made to the draft as it stands when it applies, so two in one event both land.
  onChange: (update: (draft: CustomFieldDraft) => CustomFieldDraft) => void;
  onClearError: (key: keyof CustomFieldDraftErrors) => void;
}) {
  const isEdit = field !== undefined;
  // What each type was set up with before the type was changed, so switching back keeps it.
  const [setUpAs, setSetUpAs] = useState<Partial<Record<FieldType, CustomFieldDraft>>>({});
  const changeList = (change: (list: FieldOfShape<'set', CustomFieldDraft>) => CustomFieldDraft) =>
    onChange((current) =>
      matchField<CustomFieldDraft, CustomFieldDraft>(current, {
        scalar: () => current,
        record: () => current,
        set: change,
      }),
    );
  // Shown even when it can't change, so what is being made is never a surprise.
  const typeFixed = isEdit || types.length === 1;

  return (
    <FieldGroup className={compact ? 'gap-5' : 'gap-8'}>
      <Field data-invalid={Boolean(errors.name) || undefined}>
        <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
        <Input
          aria-invalid={Boolean(errors.name) || undefined}
          autoComplete="off"
          id={`${idPrefix}-name`}
          placeholder="Enter custom field name"
          value={draft.name}
          autoFocus
          onChange={(e) => {
            onClearError('name');
            const name = e.target.value;
            onChange((current) => ({ ...current, name }));
          }}
        />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </Field>
      <Field data-disabled={typeFixed || undefined}>
        <FieldLabel>Type</FieldLabel>
        <Select
          disabled={typeFixed}
          value={draft.type}
          onValueChange={(value) => {
            const chosen = types.find((userType) => userType.id === value);
            if (chosen) {
              onClearError('settings');
              const before = setUpAs[chosen.id];
              setSetUpAs((current) => ({ ...current, [draft.type]: draft }));
              onChange((current) =>
                before
                  ? { ...before, name: current.name, access: current.access }
                  : { ...current, ...emptyTypedSettings(chosen.id), newOption: '' },
              );
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
      {matchField(draft, {
        scalar: () => null,
        record: () => null,
        set: (list) => (
          <>
            <ListOptionsEditor
              disabled={disabled}
              error={errors.settings}
              idPrefix={idPrefix}
              newOption={list.newOption}
              options={list.settings.options}
              onChange={({ options, newOption }) => {
                onClearError('settings');
                changeList((current) => ({
                  ...current,
                  newOption,
                  settings: { ...current.settings, options },
                }));
              }}
            />
            <Field data-disabled={disabled || undefined} orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={`${idPrefix}-multiple`}>Allow multiple answers</FieldLabel>
                <FieldDescription>
                  {list.settings.multiple
                    ? 'Members can choose more than one option.'
                    : 'Members choose one option.'}
                  {field?.settings?.multiple && !list.settings.multiple && (
                    <> Members who chose several keep them until they next answer.</>
                  )}
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={list.settings.multiple}
                disabled={disabled}
                id={`${idPrefix}-multiple`}
                onCheckedChange={(multiple) =>
                  changeList((current) => ({
                    ...current,
                    settings: { ...current.settings, multiple },
                  }))
                }
              />
            </Field>
          </>
        ),
      })}
      {withVisibility && (
        <VisibilityField
          access={draft.access}
          field={field}
          idPrefix={idPrefix}
          onChange={(access) => onChange((current) => ({ ...current, access }))}
        />
      )}
    </FieldGroup>
  );
}
