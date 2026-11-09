import { type ReactNode } from 'react';
import { CustomFieldTypeOption } from '@/shared/member-custom-fields/custom-field-type-option';
import {
  withList,
  withType,
  withoutListErrors,
} from '@/shared/member-custom-fields/custom-field-values';
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
  type CustomFieldFormParts,
  type CustomFieldFormState,
  CustomFieldFormContext,
  useCustomFieldForm,
} from '@/shared/member-custom-fields/custom-field-form-context';
import type { FieldType, SetSettings } from '@tryghost/metafield-types/structure';
import type {
  MemberCustomFieldAccess,
  MemberCustomFieldUserType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

/**
 * How the form looks and behaves while a save is in flight: every control is disabled, so what the
 * save is answered with still describes what is on screen. A disabled control still receives
 * pointer events, and a select menu or a drag starts from those alone, so they are turned away
 * too. An input group greys out with its input, as a plain input does.
 */
const HELD_STILL =
  'min-w-0 [&_:disabled]:pointer-events-none [&_[data-slot=input-group]:has([data-slot=input-group-control]:disabled)]:bg-field-disabled-surface';

/**
 * A custom field form: the questions placed inside it, held still while `state` is saving. Each
 * place that makes or edits a field composes the questions it asks from the parts below.
 */
export function CustomFieldForm({
  state,
  idPrefix,
  listStart,
  className,
  children,
}: {
  state: CustomFieldFormState;
  /** Prefixes the inputs' ids, so two forms on a page don't share them. */
  idPrefix: string;
  /** What a list starts from when List is chosen, such as the answers an import column holds. */
  listStart?: SetSettings;
  className?: string;
  children: ReactNode;
}) {
  const { values, errors, saving } = state;
  // The fieldset holds every control still while a save is in flight, but a select's menu opens
  // outside it, so a choice made in a menu already open as the save starts would still arrive. The
  // form ignores changes until the save is answered.
  const update: CustomFieldFormState['update'] = (change) => {
    if (!saving) {
      state.update(change);
    }
  };
  const setErrors: CustomFieldFormState['setErrors'] = (change) => {
    if (!saving) {
      state.setErrors(change);
    }
  };
  const parts: CustomFieldFormParts = {
    values,
    errors,
    idPrefix,
    setName: (name) => {
      setErrors((current) => ({ ...current, name: undefined }));
      update((current) => ({ ...current, name }));
    },
    setType: (type) => {
      setErrors(withoutListErrors);
      update((current) => withType(current, type, listStart));
    },
    changeList: (change) => {
      setErrors(withoutListErrors);
      update((current) => withList(current, change));
    },
    setAccess: (access) => update((current) => ({ ...current, access })),
  };
  return (
    <CustomFieldFormContext.Provider value={parts}>
      <fieldset className={HELD_STILL} disabled={saving}>
        <FieldGroup className={className}>{children}</FieldGroup>
      </fieldset>
    </CustomFieldFormContext.Provider>
  );
}

export function NameField() {
  const { values, errors, idPrefix, setName } = useCustomFieldForm();
  return (
    <Field data-invalid={Boolean(errors.name) || undefined}>
      <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
      <Input
        aria-invalid={Boolean(errors.name) || undefined}
        autoComplete="off"
        id={`${idPrefix}-name`}
        placeholder="Enter custom field name"
        value={values.name}
        autoFocus
        onChange={(event) => setName(event.target.value)}
      />
      {errors.name && <FieldError>{errors.name}</FieldError>}
    </Field>
  );
}

function TypeSelect({
  value,
  types,
  disabled,
  invalid,
  onChange,
}: {
  value: FieldType;
  types: readonly MemberCustomFieldUserType[];
  disabled: boolean;
  invalid: boolean;
  onChange?: (type: FieldType) => void;
}) {
  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(chosen) => {
        const type = types.find((userType) => userType.id === chosen);
        if (type) {
          onChange?.(type.id);
        }
      }}
    >
      <SelectTrigger
        aria-invalid={invalid || undefined}
        aria-label="Type"
        data-testid="custom-field-type"
      >
        <SelectValue placeholder="Select type">
          <CustomFieldTypeOption type={value} />
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
  );
}

/**
 * The type a new field is made as, chosen from `types`. A place that offers one type pins it,
 * still shown so what is being made is never a surprise.
 */
export function TypeField({
  types,
  problem,
}: {
  types: readonly MemberCustomFieldUserType[];
  /** Why the chosen type can't be made here, such as a list from a column with too many answers. */
  problem?: string;
}) {
  const { values, setType } = useCustomFieldForm();
  const pinned = types.length === 1;
  return (
    <Field data-disabled={pinned || undefined} data-invalid={Boolean(problem) || undefined}>
      <FieldLabel>Type</FieldLabel>
      <TypeSelect
        disabled={pinned}
        invalid={Boolean(problem)}
        types={types}
        value={values.type}
        onChange={setType}
      />
      {problem && <FieldError>{problem}</FieldError>}
    </Field>
  );
}

/** A saved field's type, shown but fixed: the values members already hold were made for it. */
export function FixedTypeField({ type }: { type: MemberCustomFieldUserType }) {
  return (
    <Field data-disabled>
      <FieldLabel>Type</FieldLabel>
      <TypeSelect invalid={false} types={[type]} value={type.id} disabled />
      <FieldDescription>Type can’t be changed after creation</FieldDescription>
    </Field>
  );
}

function VisibilitySwitch({
  checked,
  description,
  disabled,
  onChange,
}: {
  checked: boolean;
  description: ReactNode;
  disabled?: boolean;
  onChange?: (open: boolean) => void;
}) {
  const { idPrefix } = useCustomFieldForm();
  return (
    <Field data-disabled={disabled || undefined} orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={`${idPrefix}-visible-to-members`}>Visible to members</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch
        checked={checked}
        data-testid="custom-field-access"
        disabled={disabled}
        id={`${idPrefix}-visible-to-members`}
        onCheckedChange={onChange}
      />
    </Field>
  );
}

/**
 * Whether members can see a field, with what that means for this field spelled out. Its own
 * component so the member count it reads is only asked for where the question is.
 *
 * Ghost keeps a third access level, `read`, that the switch doesn't offer. A field saved at it
 * reads as open and is described as such. Switching it off and on again returns it to the level it
 * was saved at rather than widening it, and an edit sends access only when it changes.
 */
export function VisibilityField({
  saved,
}: {
  /** The access a saved field has, for a field being edited. A new field has none. */
  saved?: MemberCustomFieldAccess;
}) {
  const { values, setAccess } = useCustomFieldForm();
  const memberCount = useMemberCount();
  const isOpen = values.access !== 'none';
  const openLevel = saved && saved !== 'none' ? saved : 'write';
  // Opening a saved field that was closed discloses whatever staff have recorded in it so far.
  const isOpeningClosedField = saved === 'none' && isOpen;

  let description;
  if (isOpen) {
    // The count is left out while it loads, as the newsletter modal does.
    const members = `Your ${memberCount === undefined ? '' : formatNumber(memberCount)} member${memberCount === 1 ? '' : 's'}`;
    description =
      values.access === 'read'
        ? `${members} can see this field in their Portal account settings, but not change it.`
        : `${members} can see and update this field in their Portal account settings.`;
  } else {
    description = 'Only staff can see this field and what you record in it.';
  }

  return (
    <VisibilitySwitch
      checked={isOpen}
      description={
        <>
          {description}
          {isOpeningClosedField && <> Anything already recorded will become visible.</>}
        </>
      }
      onChange={(open) => setAccess(open ? openLevel : 'none')}
    />
  );
}

/**
 * Visibility for an archived field, which members never see, so there is nothing to choose until
 * it is reactivated. Offering the switch would change something invisible, and the disclosure
 * would arrive later, at reactivation, unannounced.
 */
export function ArchivedVisibilityField() {
  return (
    <VisibilitySwitch
      checked={false}
      description="Members never see an archived field. Reactivate it to choose whether they can see this one."
      disabled
    />
  );
}
