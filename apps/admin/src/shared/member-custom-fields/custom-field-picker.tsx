import CustomFieldIcon from '@/shared/member-custom-fields/custom-field-icon';
import {
  APIError,
  HostLimitError,
  JSONError,
  ValidationError,
  getErrorMessage,
} from '@tryghost/admin-x-framework/errors';
import {
  Button,
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Command,
  CommandCheck,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  commandDefaultFilter,
} from '@tryghost/shade/components';
import { CustomFieldTypeOption } from '@/shared/member-custom-fields/custom-field-type-option';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  type MemberCustomField,
  type PlainFieldType,
  useCreateMemberCustomField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useState } from 'react';

// cmdk scores an item's value and keywords as one joined string, and a match may run from
// one into the other. Identity here is the field key; the name is the keyword, and only the
// keyword is scored (the import's picker does the same, for the same reason).
function scoreByLabel(_value: string, query: string, keywords?: string[]): number {
  return commandDefaultFilter((keywords ?? []).join(' '), query);
}

export interface CustomFieldPickerProps {
  /** Accessible name for the control; also labels the create form. */
  label: string;
  /** The fields on offer. Callers filter to the types their context can accept. */
  fields: MemberCustomField[];
  /** Key of the selected field, or null for none. */
  value: string | null;
  invalid?: boolean;
  onChange: (key: string) => void;
  /**
   * The types a field created from this picker may have: one entry pins the type and the
   * create form asks only for a name; several show a type choice among exactly these.
   * Keep it within the types `fields` is filtered by — a creation outside that range
   * would make a field this picker then refuses to list. Omit to hide the create action.
   */
  createTypes?: PlainFieldType[];
}

/**
 * A single-select picker over custom fields, with creation in place.
 *
 * The shared control for any surface that maps something to a custom field (tier checkout
 * collection today; anything in settings tomorrow). Options carry the field's type icon,
 * and the list ends with the same green "+ Add custom field" the CSV import mapping uses —
 * which also stands in for the empty state, since a search finding nothing is the strongest
 * signal the field does not exist yet.
 *
 * Creation swaps the popover's content from the list to a small form, seeded from the
 * search text. The same floating surface, so the page never grows or reflows under it —
 * and the popover's focus handling carries over instead of being fought (the import's
 * picker mounts its form outside and pays for it in focus juggling). The refusal handling
 * follows the import mapping's: a name problem lands on the input, a ceiling or permission
 * problem lands below the form and stops inviting retries.
 */
export function CustomFieldPicker({
  label,
  fields,
  value,
  invalid,
  onChange,
  createTypes,
}: CustomFieldPickerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState<{ initialName: string } | null>(null);
  const [search, setSearch] = useState('');

  const selected = fields.find((field) => field.key === value);
  const canCreate = Boolean(createTypes?.length);

  // Programmatic closes bypass onOpenChange (the popover is controlled), so this owns the
  // same cleanup: without it, the search text survives a selection and silently filters
  // the reopened list — down to just the create action when nothing matches it.
  const close = () => {
    setOpen(false);
    setCreating(null);
    setSearch('');
  };

  // The create lives here rather than in the form, as the CSV import's does: what its answer
  // means, choosing the new field or showing a refusal, is the picker's business. The form asks;
  // this answers.
  const { mutateAsync: createField } = useCreateMemberCustomField();
  // Set as Save is pressed rather than read from the request, which reports itself pending only
  // a moment later. Until then Escape, a click away or a second Save would still get through.
  const [isCreating, setIsCreating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(true);
  const handleError = useHandleError();

  const clearCreateErrors = () => {
    setNameError(null);
    setSaveError(null);
    setCanRetry(true);
  };

  // The last form's refusal was about a name that has gone with it.
  const startCreating = (initialName: string) => {
    clearCreateErrors();
    setCreating({ initialName });
  };

  // The ways out of the form: back to the list, or out of the popover. Neither while its save
  // is under way, as in the CSV import: the save chooses the field it makes, so leaving first
  // would let it replace whatever is picked in the meantime.
  const leaveForm = () => {
    if (!isCreating) {
      setCreating(null);
    }
  };
  const dismiss = () => {
    if (!isCreating) {
      close();
    }
  };

  const createNewField = async (name: string, type: PlainFieldType) => {
    clearCreateErrors();
    if (!name.trim()) {
      setNameError('Enter a name for the field');
      return;
    }

    setIsCreating(true);
    try {
      // The ordinary closed default. This picker only renders where the setting for
      // opening a field to members is also available, so a publisher who wants members
      // to fill this in can say so; nothing here has to guess on their behalf.
      const response = await createField({
        name: name.trim(),
        type,
        settings: null,
        access: { member: 'none' },
      });
      const field = response.members_metafields?.[0];
      if (!field) {
        setSaveError('The field was created but could not be selected. Choose it from the list.');
        setCanRetry(false);
        return;
      }
      close();
      onChange(field.key);
    } catch (error) {
      const apiError = error instanceof JSONError ? error.data?.errors?.[0] : null;
      if (error instanceof ValidationError && apiError?.property === 'name') {
        setNameError(getErrorMessage(error, 'Invalid name'));
        return;
      }
      // Shown inline below, so no toast — but still reported, the way the CSV import's
      // picker does it, or unexpected failures on this path never reach error tracking.
      if (!(error instanceof HostLimitError)) {
        handleError(error, { withToast: false });
      }
      setSaveError(
        getErrorMessage(
          error,
          error instanceof APIError
            ? error.message
            : 'Could not create the custom field, please try again.',
        ),
      );
      setCanRetry(!(error instanceof HostLimitError) && apiError?.type !== 'NoPermissionError');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Combobox
      open={open}
      // Modal, like a select, so clicking away only closes it rather than also acting on
      // whatever the click lands on.
      modal
      onOpenChange={(next) => {
        // Clicking away mid-create abandons it, same as Escape below, once it isn't saving.
        if (next) {
          setOpen(true);
        } else {
          dismiss();
        }
      }}
    >
      <ComboboxTrigger aria-invalid={invalid || undefined} aria-label={label}>
        <ComboboxValue placeholder={!selected}>
          {selected ? (
            <span className="flex items-center gap-2">
              <CustomFieldIcon className="size-4 shrink-0" type={selected.type} />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            'Select...'
          )}
        </ComboboxValue>
      </ComboboxTrigger>
      {/* No CommandEmpty is rendered on purpose: when a search matches nothing, the
          forceMounted create action below is the answer, and an empty-state block would
          just push it down (the CSV import's picker behaves the same way). */}
      <ComboboxContent
        onEscapeKeyDown={(event) => {
          // Escape steps back: out of the form to the list, then out of the
          // popover. Otherwise it would tear down both at once — and, worse,
          // keep travelling to close whatever modal this sits in. Mid-save it
          // stays put, like Cancel.
          if (creating) {
            event.preventDefault();
            leaveForm();
          }
        }}
      >
        {creating && createTypes?.length ? (
          <CreateFieldInline
            canRetry={canRetry}
            initialName={creating.initialName}
            isSaving={isCreating}
            label={label}
            nameError={nameError}
            saveError={saveError}
            types={createTypes}
            onCancel={leaveForm}
            onEdit={clearCreateErrors}
            onSubmit={(name, type) => void createNewField(name, type)}
          />
        ) : (
          <Command filter={scoreByLabel}>
            <CommandInput placeholder="Search fields..." value={search} onValueChange={setSearch} />
            <CommandList>
              {/* Not rendered at all when there are no fields: an itemless
                                group still paints its padding, which stood as a blank band
                                between the search box and the create action. cmdk hides
                                the group by itself in the other empty case, a search that
                                filters every field out. */}
              {fields.length > 0 && (
                <CommandGroup className="p-0">
                  {fields.map((field) => (
                    <CommandItem
                      key={field.key}
                      keywords={[field.name]}
                      value={field.key}
                      onSelect={() => {
                        close();
                        onChange(field.key);
                      }}
                    >
                      <CustomFieldIcon className="size-4" type={field.type} />
                      <span className="truncate">{field.name}</span>
                      {value === field.key && <CommandCheck />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {/* A row of the list rather than a footer, exactly as the CSV
                                import draws it: it scrolls with the fields, the arrow keys
                                reach it, and when a search matches nothing it is the one
                                item left — cmdk highlights it and Enter creates. Its own
                                group because forceMount on a group pins every item in it. */}
              {canCreate && (
                <CommandGroup className="p-0" forceMount>
                  <CommandItem
                    className="font-semibold text-green"
                    value="__create-custom-field__"
                    forceMount
                    onSelect={() => startCreating(search.trim())}
                  >
                    <LucideIcon.Plus className="size-4" />
                    <span>Add custom field</span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

/**
 * The create form the popover swaps to. One offered type pins it and the form is name-only;
 * several show a choice among exactly those. Like the import mapping's, it holds only what is
 * being typed: the picker runs the create and tells it how that went.
 */
function CreateFieldInline({
  canRetry,
  initialName,
  isSaving,
  label,
  nameError,
  saveError,
  types,
  onCancel,
  onEdit,
  onSubmit,
}: {
  /** False once a refusal can't be argued with, so Save stops inviting the same request. */
  canRetry: boolean;
  initialName: string;
  isSaving: boolean;
  label: string;
  /** On the name input, for a refusal the publisher can fix by typing. */
  nameError: string | null;
  /** Below the form, for one they can't. */
  saveError: string | null;
  types: PlainFieldType[];
  onCancel: () => void;
  /** Editing answers the last refusal, which was about what was there before. */
  onEdit: () => void;
  onSubmit: (name: string, type: PlainFieldType) => void;
}) {
  const [name, setName] = useState(initialName);
  const [typeId, setTypeId] = useState<PlainFieldType>(types[0]);

  return (
    <div
      className="flex flex-col gap-3 p-3"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !isSaving && canRetry) {
          event.preventDefault();
          onSubmit(name, typeId);
        }
      }}
    >
      <Field data-invalid={Boolean(nameError) || undefined}>
        <FieldLabel className="text-sm!" htmlFor="custom-field-picker-create-name">
          New custom field
        </FieldLabel>
        <Input
          aria-invalid={Boolean(nameError) || undefined}
          aria-label={`New custom field for ${label}`}
          autoComplete="off"
          className="h-8 text-sm!"
          id="custom-field-picker-create-name"
          placeholder="Enter custom field name"
          value={name}
          autoFocus
          onChange={(event) => {
            setName(event.target.value);
            onEdit();
          }}
        />
        {nameError && <FieldError>{nameError}</FieldError>}
      </Field>
      {/* Always shown so what is being created is never a surprise; with one offered
                type it is disabled and pre-selected, the same way the field edit modal
                states an unchangeable type. */}
      <Field>
        <FieldLabel className="text-sm!">Type</FieldLabel>
        <Select
          disabled={types.length === 1}
          value={typeId}
          onValueChange={(value) => {
            const chosen = types.find((type) => type === value);
            if (chosen) {
              setTypeId(chosen);
            }
          }}
        >
          <SelectTrigger aria-label="Type" className="h-8 text-sm!">
            <SelectValue>
              <CustomFieldTypeOption type={typeId} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                <CustomFieldTypeOption type={type} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex items-center justify-end gap-2">
        <Button disabled={isSaving} size="sm" type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={isSaving || !canRetry}
          size="sm"
          type="button"
          onClick={() => onSubmit(name, typeId)}
        >
          {isSaving ? 'Saving' : 'Save'}
        </Button>
      </div>
      {saveError && (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
}
