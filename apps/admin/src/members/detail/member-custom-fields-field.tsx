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
  buildCustomFieldSavePayload,
  editableValueOf,
  emptyEditableValue,
  getCustomFieldValidationErrors,
  getEditableCustomFieldValues,
  parseCustomFieldServerErrors,
} from './member-detail-edit';
import { toast } from 'sonner';
import { z } from 'zod';
import { IdentityTextSchema } from '@tryghost/metafield-types/identity';
import {
  FIELD_STRUCTURES,
  inOptionOrder,
  isRecordValue,
  matchField,
  matchLeaf,
  matchShape,
  type Leaf,
  type SetSettings,
  type TextSize,
} from '@tryghost/metafield-types/structure';
import { partOf } from '@/members/custom-fields/addressing';
import {
  formatMemberCustomFieldValue,
  memberCustomFieldIdentity,
  memberCustomFieldChoiceLists,
  memberCustomFieldParts,
  type MemberCustomFieldChoiceList,
  type MemberCustomFieldPart,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { ChipPicker } from '@/shared/pickers/chip-picker';
import { useCustomFieldDefinitions } from '@/shared/member-custom-fields/use-definitions';
import { useEditMember } from '@tryghost/admin-x-framework/api/members';
import type { EditableCustomFieldValue, EditableRecordValue } from './member-detail-edit';
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

// A choice, picked from what its list offers, so what staff record is a key the rest of Ghost
// recognises.
const ChoiceInput: React.FC<{
  id: string;
  label: string;
  list: MemberCustomFieldChoiceList;
  value?: string;
  invalid?: boolean;
  disabled?: boolean;
  onChange: (key: string) => void;
}> = ({ id, label, list, value, invalid, disabled, onChange }) => {
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
          {value ? list.label(value) : 'Select...'}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <MultiSelectCombobox
          i18n={{ searchPlaceholder: list.searchPlaceholder }}
          isMultiSelect={false}
          options={list.options(value)}
          values={value ? [value] : []}
          autoCloseOnSelect
          onChange={(values) => onChange(values[0] ?? '')}
          onClose={() => setOpen(false)}
        />
      </ComboboxContent>
    </Combobox>
  );
};

// The options a list field offers: several as chips, like a post's tiers, or one, like a country.
// Only the options it offers now: one it no longer offers can't be picked again.
const ListInput: React.FC<{
  id: string;
  label: string;
  settings: SetSettings;
  value: string[];
  invalid?: boolean;
  disabled?: boolean;
  onChange: (options: string[]) => void;
  /** Says when the chips' list opens and closes, for a dialog that must leave Escape to it. */
  onOpenChange: (open: boolean) => void;
}> = ({ id, label, settings, value, invalid, disabled, onChange, onOpenChange }) => {
  const [open, setOpen] = React.useState(false);
  // Kept in the field's order, however they were picked.
  const inOrder = (picked: readonly string[]) => inOptionOrder(settings, picked);

  if (settings.multiple) {
    return (
      <ChipPicker<string, string>
        disabled={disabled}
        emptyMessage="No options found"
        getKey={(option) => option}
        getLabel={(option) => option}
        inputId={id}
        inputLabel={label}
        invalid={invalid}
        matches={(option, term) => option.toLowerCase().includes(term.toLowerCase())}
        options={settings.options}
        placeholder="Select..."
        renderOption={(option, { chosen }) => (
          <>
            <span className="truncate">{option}</span>
            {chosen && <LucideIcon.Check className="ms-auto size-4 shrink-0 text-primary" />}
          </>
        )}
        selected={inOrder(value)}
        onAdd={(option) => onChange(inOrder([...value, option]))}
        onOpenChange={onOpenChange}
        onRemove={(option) => onChange(inOrder(value.filter((answer) => answer !== option)))}
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
        <ComboboxValue placeholder={inOrder(value).length === 0}>
          {inOrder(value)[0] ?? 'Select...'}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <MultiSelectCombobox
          i18n={{ searchPlaceholder: 'Search options...' }}
          isMultiSelect={false}
          options={settings.options.map((option) => ({ value: option, label: option }))}
          values={inOrder(value)}
          autoCloseOnSelect
          onChange={(picked) => onChange(inOrder(picked))}
          onClose={() => setOpen(false)}
        />
      </ComboboxContent>
    </Combobox>
  );
};

const TEXT_CONTROL: { [S in TextSize]: 'input' | 'textarea' } = {
  line: 'input',
  code: 'input',
  long: 'textarea',
};

const LeafInput: React.FC<{
  leaf: Leaf;
  id: string;
  label: string;
  value: string;
  invalid?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}> = ({ leaf, id, label, value, invalid, disabled, onChange }) =>
  matchLeaf(leaf, {
    text: ({ size }) =>
      TEXT_CONTROL[size] === 'textarea' ? (
        // max-w-full: Admin's element styles cap textareas at 500px.
        <Textarea
          aria-invalid={invalid || undefined}
          className="max-w-full resize-y"
          disabled={disabled}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          aria-invalid={invalid || undefined}
          disabled={disabled}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ),
    choice: ({ from }) => (
      <ChoiceInput
        disabled={disabled}
        id={id}
        invalid={invalid}
        label={label}
        list={memberCustomFieldChoiceLists[from]}
        value={value || undefined}
        onChange={onChange}
      />
    ),
  });

// One control per part in a two-column sub-grid, in the order the type declares its parts. The parts
// its presentation marks as full-row take a whole row, the same way Portal's account settings lay a
// record out.
const RecordInput: React.FC<{
  parts: MemberCustomFieldPart[];
  inputId: string;
  value: EditableRecordValue;
  // Messages keyed by part (`line1`, `postal_code`, …).
  errors?: Record<string, string>;
  disabled?: boolean;
  onChange: (value: EditableRecordValue) => void;
}> = ({ parts, inputId, value, errors, disabled, onChange }) => (
  <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
    {parts.map(({ key: part, label, leaf, fullRow }) => {
      const partId = `${inputId}-${part}`;
      const error = errors?.[part];
      return (
        <div key={part} className={cn('flex flex-col gap-1.5', fullRow && 'md:col-span-2')}>
          <Label htmlFor={partId}>{label}</Label>
          <LeafInput
            disabled={disabled}
            id={partId}
            invalid={Boolean(error)}
            label={label}
            leaf={leaf}
            value={value[part] ?? ''}
            onChange={(next) => onChange({ ...value, [part]: next })}
          />
          <ErrorMessage message={error} />
        </div>
      );
    })}
  </div>
);

// The control for one field, from the blocks its type is composed of, so every type made of the same
// blocks is edited alike.
const CustomFieldInput: React.FC<{
  field: MemberCustomField;
  inputId: string;
  value: EditableCustomFieldValue;
  // Messages for this field: '' = the field itself, 'part' = a part of a composite.
  errors?: Record<string, string>;
  disabled?: boolean;
  onChange: (value: EditableCustomFieldValue) => void;
  onOpenChange: (open: boolean) => void;
}> = ({ field, inputId, value, errors, disabled, onChange, onOpenChange }) =>
  matchField<MemberCustomField, React.ReactElement>(field, {
    scalar: ({ type }) => (
      <LeafInput
        disabled={disabled}
        id={inputId}
        invalid={Boolean(errors?.[''])}
        label={field.name}
        leaf={FIELD_STRUCTURES[type].leaf}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
      />
    ),
    record: ({ type }) => (
      <RecordInput
        disabled={disabled}
        errors={errors}
        inputId={inputId}
        parts={memberCustomFieldParts(type) ?? []}
        value={isRecordValue(value) ? value : {}}
        onChange={onChange}
      />
    ),
    set: ({ settings }) => (
      <ListInput
        disabled={disabled}
        id={inputId}
        invalid={Boolean(errors?.[''])}
        label={field.name}
        settings={settings}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        onOpenChange={onOpenChange}
      />
    ),
  });

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
  const [value, setValue] = React.useState<EditableCustomFieldValue>(
    initialValue ?? emptyEditableValue(field),
  );
  const [saveAttempted, setSaveAttempted] = React.useState(false);
  // Whether a list inside is open. Its Escape closes that list, and the dialog hears the key
  // first, so it lets the key go while the list is open.
  const [listOpen, setListOpen] = React.useState(false);
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
  const isDirty = !dequal(editableValueOf(field, value), editableValueOf(field, initialValue));

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
          if (isDirty || editMutation.isPending || listOpen) {
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
                        scalar control a real label association (a record's parts
                        carry their own labels). */}
          {matchShape(field.type, { scalar: () => true, record: () => false, set: () => true }) && (
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
            onOpenChange={setListOpen}
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

/** A list's answers as the member holds them, and none for any other field. */
const listAnswers = (field: MemberCustomField, stored: unknown): string[] =>
  matchShape(field.type, {
    scalar: () => [],
    record: () => [],
    set: () =>
      Array.isArray(stored)
        ? stored.filter((answer): answer is string => typeof answer === 'string')
        : [],
  });

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
  const values = getEditableCustomFieldValues(metafields, fields);
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
              // Null rather than an empty line, so an unset value shows its placeholder.
              // What the member holds, read as it is stored: the editor starts from only the
              // options a list still offers, but an answer to one it no longer offers is still
              // theirs.
              const stored = metafields?.[field.namespace]?.[field.key];
              const display = formatMemberCustomFieldValue(field, stored) || null;
              // A list's answers are drawn as the chips its editor shows, since an option can
              // hold a comma and a comma-joined line would split it.
              const answers = listAnswers(field, stored);
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
