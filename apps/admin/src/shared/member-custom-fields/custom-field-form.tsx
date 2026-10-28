import ListOptionsEditor from './list-options-editor';
import type { CustomFieldDraft } from './custom-field-draft';
import { CustomFieldTypeOption } from './custom-field-type-option';
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
import { useMemberCount } from '@tryghost/admin-x-framework/api/members';
import {
  memberCustomFieldUserTypes,
  userTypeForFieldType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

/**
 * The fields that make a custom field: its name, its type, a list's options, and whether
 * members can see it. Shared by every place a field is created or edited, so each asks the
 * same questions the same way; the place decides what surrounds it and what Save does.
 */
export function CustomFieldForm({
  draft,
  field,
  errors = {},
  idPrefix = 'custom-field',
  types,
  withVisibility = false,
  compact = false,
  optionsVersion,
  onChange,
  onClearError,
}: {
  draft: CustomFieldDraft;
  // The field being edited. Its type is fixed, and its access shapes what the switch says.
  field?: MemberCustomField;
  errors?: { name?: string; options?: string };
  idPrefix?: string;
  // The types the field may have, where a place can only use some; one pins it.
  types?: MemberCustomField['type'][];
  // Whether members' access is asked here. Off where a field is made in passing, since a
  // new field starts staff-only and is opened to members later, in Settings.
  withVisibility?: boolean;
  // Tighter spacing for a popover; Settings' modal keeps its room.
  compact?: boolean;
  // Changed when the options are replaced from outside, since the editor keeps its own rows.
  optionsVersion?: number;
  onChange: (change: Partial<CustomFieldDraft>) => void;
  onClearError?: (key: 'name' | 'options') => void;
}) {
  const memberCount = useMemberCount();
  const isEdit = field !== undefined;
  const isArchived = field?.status === 'archived';
  const offeredTypes = memberCustomFieldUserTypes.filter(
    (userType) => !types || types.includes(userType.id),
  );
  // Shown even when it can't change, so what is being made is never a surprise.
  const typeFixed = isEdit || offeredTypes.length === 1;

  // The API keeps a third access level, `read`, that the switch doesn't offer. A field
  // already set to it reads as open and is described as such; saving without touching
  // the switch leaves it there, since the edit sends only what changed, and switching it
  // off and on again returns it to the level it had rather than upgrading it.
  const isOpenToMembers = draft.access !== 'none';
  const storedOpenLevel = field && field.access.member !== 'none' ? field.access.member : 'write';
  // Opening a field that was closed discloses whatever staff have recorded in it so far.
  const isOpeningClosedField = isEdit && isOpenToMembers && field.access.member === 'none';

  let accessDescription;
  if (isArchived) {
    accessDescription =
      'Members never see an archived field. Reactivate it to choose whether they can see this one.';
  } else if (isOpenToMembers) {
    // The count is left out while it loads, as the newsletter modal does.
    const members = `Your ${memberCount === undefined ? '' : formatNumber(memberCount)} member${memberCount === 1 ? '' : 's'}`;
    accessDescription =
      draft.access === 'read'
        ? `${members} can see this field in their Portal account settings, but not change it.`
        : `${members} can see and update this field in their Portal account settings.`;
  } else {
    accessDescription = 'Only staff can see this field and what you record in it.';
  }

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
            onClearError?.('name');
            onChange({ name: e.target.value });
          }}
        />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </Field>
      <Field data-disabled={typeFixed || undefined}>
        <FieldLabel>Type</FieldLabel>
        <Select
          disabled={typeFixed}
          value={draft.type}
          onValueChange={(value) =>
            onChange({ type: userTypeForFieldType(value as MemberCustomField['type']).id })
          }
        >
          <SelectTrigger aria-label="Type" data-testid="custom-field-type">
            <SelectValue placeholder="Select type">
              <CustomFieldTypeOption type={draft.type} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {offeredTypes.map((userType) => (
              <SelectItem key={userType.id} value={userType.id}>
                <CustomFieldTypeOption type={userType.id} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isEdit && <FieldDescription>Type can’t be changed after creation</FieldDescription>}
      </Field>
      {userTypeForFieldType(draft.type).input === 'list' && (
        <>
          {/* Answers are checked against the options when they are given, never after,
              so an edit here only changes what is offered from now on. */}
          <ListOptionsEditor
            key={optionsVersion}
            error={errors.options}
            options={draft.options}
            onChange={(options) => {
              onClearError?.('options');
              onChange({ options });
            }}
          />
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={`${idPrefix}-multiple`}>Allow multiple answers</FieldLabel>
              <FieldDescription>Members can choose more than one option</FieldDescription>
            </FieldContent>
            <Switch
              checked={draft.multiple}
              id={`${idPrefix}-multiple`}
              onCheckedChange={(multiple) => onChange({ multiple })}
            />
          </Field>
        </>
      )}
      {withVisibility && (
        <Field data-disabled={isArchived || undefined} orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={`${idPrefix}-visible-to-members`}>Visible to members</FieldLabel>
            <FieldDescription>
              {accessDescription}
              {isOpeningClosedField && <> Anything already recorded will become visible.</>}
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={!isArchived && isOpenToMembers}
            data-testid="custom-field-access"
            disabled={isArchived}
            id={`${idPrefix}-visible-to-members`}
            onCheckedChange={(checked) => onChange({ access: checked ? storedOpenLevel : 'none' })}
          />
        </Field>
      )}
    </FieldGroup>
  );
}
