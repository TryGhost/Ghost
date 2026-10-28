import React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  LoadingIndicator,
  MultiSelectCombobox,
  Textarea,
  tokenFieldClasses,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { dequal } from 'dequal';
import {
  ADDRESS_PARTS,
  buildCustomFieldSavePayload,
  getCustomFieldValidationErrors,
  getEditableCustomFieldValues,
  parseCustomFieldServerErrors,
} from './member-detail-edit';
import { toast } from 'sonner';
import { z } from 'zod';
import { IdentityTextSchema } from '@tryghost/metafield-types/identity';
import { partOf } from '@/members/custom-fields/addressing';
import {
  formatMemberCustomFieldValue,
  memberCustomFieldIdentity,
  userTypeForField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { useCustomFieldDefinitions } from '@/shared/member-custom-fields/use-definitions';
import { ChipPicker } from '@/shared/pickers/chip-picker';
import { countryName, countryOptions } from '@tryghost/admin-x-framework/utils/countries';
import { useEditMember } from '@tryghost/admin-x-framework/api/members';
import type { EditableAddressValue, EditableCustomFieldValue } from './member-detail-edit';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

interface MemberCustomFieldsFieldProps {
  memberId: string;
  metafields: Record<string, Record<string, unknown> | undefined> | undefined;
  disabled?: boolean;
}

// role='alert': after a save-attempt these render while focus stays on the Save
// button, so an assertive live region is the only way a screen reader hears the
// failure.
const ErrorMessage: React.FC<{ message?: string }> = ({ message }) => {
  return message ? (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null;
};

// The country part of an address: picked from the countries an address may name, so what
// staff record is a code the rest of Ghost recognises.
const CountryInput: React.FC<{
  id: string;
  label: string;
  value?: string;
  invalid?: boolean;
  disabled?: boolean;
  onChange: (code: string) => void;
}> = ({ id, label, value, invalid, disabled, onChange }) => {
  const [open, setOpen] = React.useState(false);
  return (
    // Modal, as the import field picker is: inside a dialog, only a modal popover's
    // list can be scrolled.
    <Combobox open={open} modal onOpenChange={setOpen}>
      <ComboboxTrigger
        aria-invalid={invalid || undefined}
        aria-label={label}
        disabled={disabled}
        id={id}
      >
        <ComboboxValue placeholder={!value}>
          {value ? countryName(value) : 'Select...'}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <MultiSelectCombobox
          i18n={{ searchPlaceholder: 'Search countries...' }}
          isMultiSelect={false}
          options={countryOptions(value)}
          values={value ? [value] : []}
          autoCloseOnSelect
          onChange={(values) => onChange(values[0] ?? '')}
          onClose={() => setOpen(false)}
        />
      </ComboboxContent>
    </Combobox>
  );
};

// A list's answers, picked from the field's options: one, like a country, or several as
// chips, like a post's tiers. Options can change after answers are saved, so an answer
// that is no longer an option is still listed, the way a stored country this build
// doesn't know is, and shows as chosen until someone removes it.
const ListInput: React.FC<{
  id: string;
  label: string;
  field: MemberCustomField;
  value: string[];
  invalid?: boolean;
  disabled?: boolean;
  onChange: (answers: string[]) => void;
}> = ({ id, label, field, value, invalid, disabled, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const offered = field.options ?? [];
  const choices = [...offered, ...value.filter((answer) => !offered.includes(answer))];
  // Kept in the order the options are offered, whatever order they were picked in.
  const inOrder = (answers: string[]) => choices.filter((choice) => answers.includes(choice));

  if (field.multiple) {
    return (
      <ChipPicker<string, string>
        emptyMessage="No options found"
        getKey={(choice) => choice}
        getLabel={(choice) => choice}
        inputId={id}
        inputLabel={label}
        invalid={invalid}
        matches={(choice, term) => choice.toLowerCase().includes(term.toLowerCase())}
        options={choices}
        placeholder="Select..."
        renderOption={(choice, { chosen }) => (
          <>
            <span className="truncate">{choice}</span>
            {chosen && <LucideIcon.Check className="ms-auto size-4 shrink-0 text-primary" />}
          </>
        )}
        selected={value}
        onAdd={(choice) => onChange(inOrder([...value, choice]))}
        onRemove={(choice) => onChange(value.filter((answer) => answer !== choice))}
      />
    );
  }

  return (
    <Combobox open={open} modal onOpenChange={setOpen}>
      <ComboboxTrigger
        aria-invalid={invalid || undefined}
        aria-label={label}
        disabled={disabled}
        id={id}
      >
        <ComboboxValue placeholder={value.length === 0}>
          {value.length ? value.join(', ') : 'Select...'}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <MultiSelectCombobox
          i18n={{ searchPlaceholder: 'Search options...' }}
          isMultiSelect={false}
          options={choices.map((choice) => ({ value: choice, label: choice }))}
          values={value}
          autoCloseOnSelect
          onChange={(values) => onChange(inOrder(values))}
          onClose={() => setOpen(false)}
        />
      </ComboboxContent>
    </Combobox>
  );
};

// The address composite: one input per part in a two-column sub-grid. The
// street lines take a full row, since they are the long parts, and the short
// parts pair up, the same way Portal's account settings lay an address out.
const AddressInput: React.FC<{
  inputId: string;
  value: EditableAddressValue;
  // Messages keyed by part (`line1`, `postal_code`, …).
  errors?: Record<string, string>;
  disabled?: boolean;
  onChange: (value: EditableAddressValue) => void;
}> = ({ inputId, value, errors, disabled, onChange }) => {
  return (
    <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
      {ADDRESS_PARTS.map(({ key: part, label, type }) => {
        const partId = `${inputId}-${part}`;
        const error = errors?.[part];
        return (
          <div
            key={part}
            className={cn(
              'flex flex-col gap-1.5',
              (part === 'line1' || part === 'line2') && 'md:col-span-2',
            )}
          >
            <Label htmlFor={partId}>{label}</Label>
            {type === 'country_code' ? (
              <CountryInput
                disabled={disabled}
                id={partId}
                invalid={Boolean(error)}
                label={label}
                value={value[part]}
                onChange={(code) => onChange({ ...value, [part]: code })}
              />
            ) : (
              <Input
                aria-invalid={error ? true : undefined}
                disabled={disabled}
                id={partId}
                value={value[part] ?? ''}
                onChange={(e) => onChange({ ...value, [part]: e.target.value })}
              />
            )}
            <ErrorMessage message={error} />
          </div>
        );
      })}
    </div>
  );
};

// Exists so the switch has to account for every control the catalog can name.
function assertNoControl(input: never): null {
  void input;
  return null;
}

// The control for one field, picked from the presentation catalog's `input`
// hint — the same hint the collection forms render from, so the editor and
// the member-facing forms never diverge per type.
const CustomFieldInput: React.FC<{
  field: MemberCustomField;
  inputId: string;
  value: EditableCustomFieldValue;
  // Messages for this field: '' = the field itself, 'part' = a part of a composite.
  errors?: Record<string, string>;
  disabled?: boolean;
  onChange: (value: EditableCustomFieldValue) => void;
}> = ({ field, inputId, value, errors, disabled, onChange }) => {
  const fieldError = errors?.[''];
  const { input } = userTypeForField(field);
  switch (input) {
    case 'text':
      return (
        <Input
          aria-invalid={fieldError ? true : undefined}
          disabled={disabled}
          id={inputId}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'textarea':
      // max-w-full: Admin's element styles cap textareas at 500px.
      return (
        <Textarea
          aria-invalid={fieldError ? true : undefined}
          className="max-w-full resize-y"
          disabled={disabled}
          id={inputId}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'address':
      return (
        <AddressInput
          disabled={disabled}
          errors={errors}
          inputId={inputId}
          value={typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}}
          onChange={onChange}
        />
      );
    case 'list':
      return (
        <ListInput
          disabled={disabled}
          field={field}
          id={inputId}
          invalid={Boolean(fieldError)}
          label={field.name}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      );
    default:
      // Unreachable: `input` comes from the catalog, not the server. Typed never so a
      // control added to the catalog fails the build here rather than rendering nothing.
      return assertNoControl(input);
  }
};

/**
 * The editor for ONE field's value, with its own Save: one field, one save,
 * one clear outcome — deliberately outside the page's draft/Save flow so
 * "which Save saves what" never needs answering. Validation mirrors the
 * page's email field: computed live, rendered on save-attempt; a server 422
 * naming this field pins its message to the input as a backstop.
 */
const MemberCustomFieldEditModal: React.FC<{
  memberId: string;
  field: MemberCustomField;
  initialValue: EditableCustomFieldValue | undefined;
  onClose: () => void;
}> = ({ memberId, field, initialValue, onClose }) => {
  const { input } = userTypeForField(field);
  const isAddressField = input === 'address';
  const [value, setValue] = React.useState<EditableCustomFieldValue>(() => {
    if (initialValue !== undefined) {
      return initialValue;
    }
    if (isAddressField) {
      return {};
    }
    return input === 'list' ? [] : '';
  });
  const [saveAttempted, setSaveAttempted] = React.useState(false);
  const [serverErrors, setServerErrors] = React.useState<Record<string, string> | undefined>();
  const editMutation = useEditMember();

  const validationErrors = getCustomFieldValidationErrors({ [field.key]: value }, [field]);
  const errors = { ...(saveAttempted ? validationErrors : {}), ...serverErrors };
  // Keyed by the part each names, which is how the input places them. The dialog saves this one
  // field, so an error naming anything but one of its parts is about the field itself.
  const inputErrors = Object.fromEntries(
    Object.entries(errors).map(([identity, message]) => {
      const named = z.safeDecode(IdentityTextSchema, identity).data;
      const ofField = named?.namespace === field.namespace && named.key === field.key;
      return [ofField ? partOf(named) : '', message];
    }),
  );

  const inputId = `member-custom-field-${field.key}`;

  // Pristine editors dismiss freely (outside click, Escape); a dirty one
  // refuses casual dismissal — Cancel is the one explicit way to discard,
  // so typed values can never be lost by a stray click.
  const isDirty = !dequal(
    getEditableCustomFieldValues({ [field.namespace]: { [field.key]: value } }),
    getEditableCustomFieldValues({ [field.namespace]: { [field.key]: initialValue } }),
  );

  const onSave = () => {
    if (editMutation.isPending) {
      return;
    }
    // An unchanged value has nothing to write; skip the PUT entirely. The
    // merge is keyed on the field, so a no-op save would still declare a
    // member change and fire member.edited (webhooks, audit) for a value
    // that didn't move. Mirrors the page-level save's dirty gate.
    if (!isDirty) {
      onClose();
      return;
    }
    if (Object.keys(validationErrors).length > 0) {
      setSaveAttempted(true);
      return;
    }
    editMutation.mutate(buildCustomFieldSavePayload(memberId, field, value), {
      onSuccess: () => {
        toast.success(`${field.name} saved`);
        onClose();
      },
      onError: (saveError) => {
        const parsed = parseCustomFieldServerErrors(saveError);
        setServerErrors(parsed);
        if (!parsed) {
          toast.error(`${field.name} couldn’t be saved`);
        }
      },
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // Never dismiss while the save is in flight: closing here would let
        // the field be reopened and saved again, racing two PUTs whose order
        // isn't guaranteed. A dirty editor also refuses casual dismissal.
        if (!open && !editMutation.isPending) {
          onClose();
        }
      }}
    >
      <DialogContent
        data-testid="member-custom-field-edit-modal"
        onEscapeKeyDown={(event) => {
          if (isDirty || editMutation.isPending) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (isDirty || editMutation.isPending) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{field.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          {/* The dialog title names the field visually; this gives the
                        scalar control a real label association (address parts
                        carry their own labels). */}
          {!isAddressField && (
            <Label className="sr-only" htmlFor={inputId}>
              {field.name}
            </Label>
          )}
          <CustomFieldInput
            disabled={editMutation.isPending}
            errors={inputErrors}
            field={field}
            inputId={inputId}
            value={value}
            onChange={(next) => {
              setServerErrors(undefined);
              setValue(next);
            }}
          />
          <ErrorMessage message={inputErrors['']} />
        </div>
        <DialogFooter>
          <Button disabled={editMutation.isPending} variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="min-w-16" disabled={editMutation.isPending} onClick={onSave}>
            {editMutation.isPending ? (
              <>
                <LoadingIndicator size="sm" />
                <span className="sr-only">Saving</span>
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * The Custom fields section of the member detail screen: a read-only list of
 * the member's values, one row per field defined in Settings. This screen is
 * a record, not a form — an admin's daily relationship to this data is
 * reading it, so nothing here is a hot input. Editing is a deliberate act:
 * the pencil opens a per-field editor with its own Save. Owns its external
 * heading + card so it hides entirely (returning null) when the site has no
 * fields — the Settings section is the entry point for defining them.
 */
const MemberCustomFieldsField: React.FC<MemberCustomFieldsFieldProps> = ({
  memberId,
  metafields,
  disabled,
}) => {
  const { data, isLoading } = useCustomFieldDefinitions();
  const fields = data ?? [];
  const values = getEditableCustomFieldValues(metafields);
  const [editingField, setEditingField] = React.useState<MemberCustomField | null>(null);

  if (isLoading || fields.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="member-custom-fields-heading"
      className="flex flex-col gap-3"
      data-testid="member-custom-fields-field"
    >
      <h3 className="text-base font-semibold" id="member-custom-fields-heading">
        Custom fields
      </h3>
      <Card>
        {/* Rows are uniform (py-3, no first/last trims) so hover chips are all
                    the same height; the card's vertical padding is what gives the
                    first and last chips breathing room from the card edge. */}
        <CardContent className="px-6 py-4">
          <ul>
            {fields.map((field) => {
              const value = values[memberCustomFieldIdentity(field)];
              // Null rather than an empty line, so an unset value shows its placeholder.
              const display = formatMemberCustomFieldValue(field.type, value) || null;
              // A list's answers are drawn as the chips its editor shows, since an option
              // can hold a comma and a comma-joined line would split it.
              const answers =
                userTypeForField(field).input === 'list' && Array.isArray(value) ? value : [];
              return (
                // Dividers fade around the hovered row (its own border-b, and the
                // previous row's via :has), so the hover tint floats free of the
                // lines — the same effect as the settings list rows.
                <li
                  key={field.key}
                  className="border-b border-border transition-colors last:border-b-0 hover:border-b-transparent [&:has(+li:hover)]:border-b-transparent"
                >
                  {/* The whole row opens the editor (the tags list pattern);
                                        the pencil is a hover/focus-revealed affordance, not the
                                        control itself. */}
                  <button
                    // An explicit label overrides the inner spans as the accessible
                    // name, so carry the value into it — otherwise a screen reader
                    // announces only the field name and never its current value.
                    aria-label={display ? `Edit ${field.name}: ${display}` : `Edit ${field.name}`}
                    // -mx/px + calc width: the hover tint bleeds past the text
                    // column like the settings rows, while the row text (and the
                    // li dividers) stay aligned with the rest of the card.
                    className="group -mx-3 flex w-[calc(100%+1.5rem)] items-center justify-between gap-4 rounded-md p-3 text-left transition-colors hover:bg-table-row-hover disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled}
                    type="button"
                    onClick={() => {
                      // A drag-selection released over the row still fires a
                      // click; copying a value is as legitimate as editing it,
                      // so an active selection must not open the editor.
                      if (window.getSelection()?.toString()) {
                        return;
                      }
                      setEditingField(field);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm text-muted-foreground">{field.name}</span>
                      {/* select-text: button text is unselectable by default,
                                                and values (addresses especially) get copied. */}
                      {answers.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1 select-text">
                          {answers.map((answer) => (
                            <Badge
                              key={answer}
                              className={cn(
                                tokenFieldClasses.chip,
                                'cursor-[inherit] bg-secondary pr-2',
                              )}
                              variant="outline"
                              asChild
                            >
                              <span>{answer}</span>
                            </Badge>
                          ))}
                        </span>
                      )}
                      {answers.length === 0 && display && (
                        <span className="block break-words select-text">{display}</span>
                      )}
                      {!display && <span className="block text-muted-foreground">–</span>}
                    </span>
                    <LucideIcon.Pen
                      aria-hidden="true"
                      className="shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-focus-visible:opacity-100"
                      size={16}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      {editingField && (
        <MemberCustomFieldEditModal
          key={editingField.key}
          field={editingField}
          initialValue={values[memberCustomFieldIdentity(editingField)]}
          memberId={memberId}
          onClose={() => setEditingField(null)}
        />
      )}
    </section>
  );
};

export default MemberCustomFieldsField;
