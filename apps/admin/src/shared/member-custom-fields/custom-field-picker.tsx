import CustomFieldIcon from '@/shared/member-custom-fields/custom-field-icon';
import {
  APIError,
  HostLimitError,
  JSONError,
  ValidationError,
  getErrorMessage,
} from '@tryghost/admin-x-framework/errors';
import {
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
  commandDefaultFilter,
} from '@tryghost/shade/components';
import { CreateCustomFieldPanel } from '@/shared/member-custom-fields/create-custom-field-panel';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  type MemberCustomField,
  type NewMemberCustomField,
  useCreateMemberCustomField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { type RefObject, useRef, useState } from 'react';

// cmdk scores an item's value and keywords as one joined string, and a match may run from
// one into the other. Identity here is the field key; the name is the keyword, and only the
// keyword is scored (the import's picker does the same, for the same reason).
function scoreByLabel(_value: string, query: string, keywords?: string[]): number {
  return commandDefaultFilter((keywords ?? []).join(' '), query);
}

export interface CustomFieldPickerProps {
  id?: string;
  /** Accessible name for the control. */
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
  createTypes?: MemberCustomField['type'][];
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
 * Creation opens the same field panel the CSV import does, seeded from the search text, with the
 * type pinned to what this place can use. The refusal handling follows the import
 * mapping's: a name problem lands on the input, a ceiling or permission problem lands
 * below the form and stops inviting retries.
 */
export function CustomFieldPicker({
  id,
  label,
  fields,
  value,
  invalid,
  onChange,
  createTypes,
}: CustomFieldPickerProps) {
  const [open, setOpen] = useState(false);
  // What the field panel hangs from, when it is a popover.
  const pickerRef = useRef<HTMLDivElement>(null);
  // Set while the list closes to open the field panel, so it leaves focus to the panel.
  const openingPanel = useRef(false);
  // The field panel stays mounted and only opens and closes, so it can animate away rather
  // than vanish. Each opening is a new session, which starts its form afresh.
  const [creating, setCreating] = useState(false);
  const [createSession, setCreateSession] = useState({ id: 0, initialName: '' });
  const [search, setSearch] = useState('');

  const selected = fields.find((field) => field.key === value);
  const canCreate = Boolean(createTypes?.length);

  // Programmatic closes bypass onOpenChange (the popover is controlled), so this owns the
  // same cleanup: without it, the search text survives a selection and silently filters
  // the reopened list — down to just the create action when nothing matches it.
  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <div ref={pickerRef}>
        <Combobox
          open={open}
          onOpenChange={(next) => {
            if (next) {
              setOpen(true);
            } else {
              close();
            }
          }}
        >
          <ComboboxTrigger aria-invalid={invalid || undefined} aria-label={label} id={id}>
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
            onCloseAutoFocus={(event) => {
              if (openingPanel.current) {
                openingPanel.current = false;
                event.preventDefault();
              }
            }}
          >
            <Command filter={scoreByLabel}>
              <CommandInput
                placeholder="Search fields..."
                value={search}
                onValueChange={setSearch}
              />
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
                      onSelect={() => {
                        // The field panel takes over from the list, keeping what was searched for.
                        setCreateSession((session) => ({
                          id: session.id + 1,
                          initialName: search.trim(),
                        }));
                        openingPanel.current = true;
                        setCreating(true);
                        setOpen(false);
                        setSearch('');
                      }}
                    >
                      <LucideIcon.Plus className="size-4" />
                      <span>Add custom field</span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </ComboboxContent>
        </Combobox>
      </div>
      {createTypes?.length ? (
        <CreateFieldInPanel
          key={createSession.id}
          anchorRef={pickerRef}
          initialName={createSession.initialName}
          open={creating}
          types={createTypes}
          onCancel={() => setCreating(false)}
          onCreated={(key) => {
            setCreating(false);
            onChange(key);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * A field made from this picker, in the shared field panel. One offered type pins it; several show
 * a choice among exactly those. Refusal handling mirrors the import mapping.
 */
function CreateFieldInPanel({
  anchorRef,
  initialName,
  open,
  types,
  onCancel,
  onCreated,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  initialName: string;
  open: boolean;
  types: MemberCustomField['type'][];
  onCancel: () => void;
  onCreated: (key: string) => void;
}) {
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(true);
  const { mutateAsync: createField, isPending: isCreating } = useCreateMemberCustomField();
  const handleError = useHandleError();

  const submit = async (newField: NewMemberCustomField) => {
    try {
      const response = await createField({ ...newField, name: newField.name.trim() });
      const field = response.members_metafields?.[0];
      if (!field) {
        setSaveError('The field was created but could not be selected. Choose it from the list.');
        setCanRetry(false);
        return;
      }
      onCreated(field.key);
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
    }
  };

  return (
    <CreateCustomFieldPanel
      anchorRef={anchorRef}
      canRetry={canRetry}
      initialName={initialName}
      isSaving={isCreating}
      nameError={nameError}
      open={open}
      saveError={saveError}
      types={types}
      onCancel={onCancel}
      onEdit={() => {
        setNameError(null);
        setSaveError(null);
        setCanRetry(true);
      }}
      onSubmit={(newField) => void submit(newField)}
    />
  );
}
