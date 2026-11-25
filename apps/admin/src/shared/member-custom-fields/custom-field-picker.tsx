import { ArchivedBadge } from '@/shared/archived-badge';
import CustomFieldIcon from '@/shared/member-custom-fields/custom-field-icon';
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
import { CreateCustomFieldPopover } from '@/shared/member-custom-fields/create-custom-field-popover';
import { LucideIcon } from '@tryghost/shade/utils';
import type {
  CreatableMemberCustomFieldTypes,
  MemberCustomField,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { CustomFieldValues } from '@/shared/member-custom-fields/custom-field-values';
import { useCustomFieldCreateAttempt } from '@/shared/member-custom-fields/use-custom-field-create-attempt';
import { useRef, useState } from 'react';

// cmdk scores an item's value and keywords as one joined string, and a match may run from
// one into the other. Identity here is the field key; the name is the keyword, and only the
// keyword is scored (the import's picker does the same, for the same reason).
function scoreByLabel(_value: string, query: string, keywords?: string[]): number {
  return commandDefaultFilter((keywords ?? []).join(' '), query);
}

export interface CustomFieldPickerProps {
  /** Accessible name for the control. */
  label: string;
  /** The fields on offer. Callers filter to the types their context can accept. */
  fields: MemberCustomField[];
  /** Key of the selected field, or null for none. */
  value: string | null;
  invalid?: boolean;
  onChange: (key: string) => void;
  /**
   * The types a field created from this picker may have: one entry pins the type, which the
   * create form still shows, disabled; several offer a choice among exactly these.
   * Keep it within the types `fields` is filtered by — a creation outside that range
   * would make a field this picker then refuses to list. Only types the site can create a field
   * with, narrowed with `creatableTypesAmong`. Omit, or leave empty, to hide the create action.
   */
  createTypes?: CreatableMemberCustomFieldTypes;
  /** The name a field created from this picker starts with, when nothing was searched for. */
  suggestedName?: string;
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
 * Creation opens the popover the CSV import opens, anchored to this picker and seeded from the
 * search text, with the types this place can use. It creates the field as the CSV import does,
 * through `useCustomFieldCreateAttempt`, so both show a refusal the same way.
 */
export function CustomFieldPicker({
  label,
  fields,
  value,
  invalid,
  onChange,
  createTypes,
  suggestedName,
}: CustomFieldPickerProps) {
  const [open, setOpen] = useState(false);
  // What the create popover hangs from.
  const pickerRef = useRef<HTMLDivElement>(null);
  // Set while the list closes to open the create popover, so it leaves focus to the popover.
  const openingCreate = useRef(false);
  // The create popover stays mounted and only opens and closes. Each opening is a new session,
  // which starts its form afresh.
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

  // What the create's answer means here, choosing the new field, is the picker's business. The
  // form asks; this answers.
  const {
    attempt: createAttempt,
    create,
    reset: resetCreate,
  } = useCustomFieldCreateAttempt({
    createdUnusable: 'The field was created but could not be selected. Choose it from the list.',
  });

  // Not while its save is under way, as in the CSV import: the save chooses the field it makes,
  // so leaving first would let it replace whatever is picked in the meantime.
  const leaveForm = () => {
    if (createAttempt.state !== 'saving') {
      setCreating(false);
    }
  };

  // The ordinary closed default. This picker only renders where the setting for opening a field
  // to members is also available, so a publisher who wants members to fill this in can say so;
  // nothing here has to guess on their behalf.
  const createNewField = async (values: CustomFieldValues) => {
    const field = await create(values);
    if (field) {
      setCreating(false);
      onChange(field.key);
    }
  };

  return (
    <>
      <div ref={pickerRef}>
        <Combobox
          open={open}
          // Modal, like a select, so clicking away only closes it rather than also acting on
          // whatever the click lands on.
          modal
          onOpenChange={(next) => {
            if (next) {
              setOpen(true);
            } else {
              close();
            }
          }}
        >
          <ComboboxTrigger aria-invalid={invalid || undefined} aria-label={label}>
            <ComboboxValue placeholder={!selected}>
              {selected ? (
                <span className="flex items-center gap-2">
                  <CustomFieldIcon className="size-4 shrink-0" type={selected.type} />
                  <span className="truncate">{selected.name}</span>
                  {selected.status === 'archived' && <ArchivedBadge />}
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
              if (openingCreate.current) {
                openingCreate.current = false;
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
                        <span className="truncate" title={field.name}>
                          {field.name}
                        </span>
                        {field.status === 'archived' && <ArchivedBadge />}
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
                        // The create popover takes over from the list, keeping what was
                        // searched for, or starting from the suggested name when nothing was.
                        setCreateSession((session) => ({
                          id: session.id + 1,
                          initialName: search.trim() || suggestedName || '',
                        }));
                        // The last form's refusal was about a name that has gone with it.
                        resetCreate();
                        openingCreate.current = true;
                        setCreating(true);
                        close();
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
        <CreateCustomFieldPopover
          key={createSession.id}
          anchorRef={pickerRef}
          attempt={createAttempt}
          initialName={createSession.initialName}
          open={creating}
          testId="custom-field-picker-create"
          types={createTypes}
          onCancel={leaveForm}
          onEdit={resetCreate}
          onSubmit={(values) => void createNewField(values)}
        />
      ) : null}
    </>
  );
}
