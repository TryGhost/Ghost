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
  MultiSelectCombobox,
  Textarea,
  tokenFieldClasses,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import {
  buildCustomFieldSavePayload,
  customFieldSave,
  editorFor,
  getCustomFieldValidationErrors,
  isEdited,
  parseCustomFieldServerErrors,
  type CustomFieldEditor,
  type OpenedEditor,
} from './member-detail-edit';
import { toast } from 'sonner';
import { z } from 'zod';
import { IdentityTextSchema } from '@tryghost/metafield-types/identity';
import {
  FIELD_STRUCTURES,
  inOptionOrder,
  matchLeaf,
  matchShape,
  type Leaf,
  type SetSettings,
  type TextFormat,
} from '@tryghost/metafield-types/structure';
import { partOf } from '@/members/custom-fields/addressing';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import {
  formatMemberCustomFieldValue,
  memberCustomFieldChoiceLists,
  memberCustomFieldParts,
  type MemberCustomFieldChoiceList,
  type MemberCustomFieldPart,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { ChipPicker } from '@/shared/pickers/chip-picker';
import { useCustomFieldDefinitions } from '@/shared/member-custom-fields/use-definitions';
import { useEditMember } from '@tryghost/admin-x-framework/api/members';
import type { ShapeText } from '@tryghost/metafield-types/shapes';
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

const TEXT_CONTROL: { [F in TextFormat]: 'input' | 'textarea' } = {
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
    text: ({ format }) =>
      TEXT_CONTROL[format] === 'textarea' ? (
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
  value: ShapeText['record'];
  // Messages keyed by part (`line1`, `postal_code`, …).
  errors?: Record<string, string>;
  disabled?: boolean;
  onChange: (value: ShapeText['record']) => void;
}> = ({ parts, inputId, value, errors, disabled, onChange }) => (
  <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
    {parts.map(({ key: part, label, leaf, fullRow }) => {
      const partId = `${inputId}-${part}`;
      const error = errors?.[part];
      return (
        <div
          key={part}
          className={cn(
            'flex flex-col gap-1.5 in-data-[admin7-design=true]:gap-2',
            fullRow && 'md:col-span-2',
          )}
        >
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
// blocks is edited alike. The editor carries its field's shape with its inputs' text, so each control
// is handed text of its own shape.
const CustomFieldInput: React.FC<{
  editor: CustomFieldEditor;
  inputId: string;
  // Messages for this field: '' = the field itself, 'part' = a part of a composite.
  errors?: Record<string, string>;
  disabled?: boolean;
  onChange: (editor: CustomFieldEditor) => void;
  onOpenChange: (open: boolean) => void;
  // The return type is stated so that a shape without a case here fails to compile.
}> = ({ editor, inputId, errors, disabled, onChange, onOpenChange }): React.ReactElement => {
  switch (editor.shape) {
    case 'scalar':
      return (
        <LeafInput
          disabled={disabled}
          id={inputId}
          invalid={Boolean(errors?.[''])}
          label={editor.field.name}
          leaf={FIELD_STRUCTURES[editor.field.type].leaf}
          value={editor.text}
          onChange={(text) => onChange({ ...editor, text })}
        />
      );
    case 'record':
      return (
        <RecordInput
          disabled={disabled}
          errors={errors}
          inputId={inputId}
          parts={memberCustomFieldParts(editor.field.type) ?? []}
          value={editor.text}
          onChange={(text) => onChange({ ...editor, text })}
        />
      );
    case 'set':
      return (
        <ListInput
          disabled={disabled}
          id={inputId}
          invalid={Boolean(errors?.[''])}
          label={editor.field.name}
          settings={editor.field.settings}
          value={editor.text}
          onChange={(text) => onChange({ ...editor, text })}
          onOpenChange={onOpenChange}
        />
      );
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
  /** What the member holds for the field, as the members API gives it, including what the editor can't show. */
  held: unknown;
  onClose: () => void;
}> = ({ memberId, field, held, onClose }) => {
  // What the member held when the editor opened, and the editor as it opened on it. A save is
  // worked out against that, not against a value refetched since, so the save names only the
  // parts the person changed and never reverts another writer's.
  const [opened] = React.useState<OpenedEditor>(() => ({ held, editor: editorFor(field, held) }));
  const [editor, setEditor] = React.useState<CustomFieldEditor>(opened.editor);
  const [saveAttempted, setSaveAttempted] = React.useState(false);
  // Whether a picker inside is open. Its Escape closes the picker, and the dialog hears the key
  // first, so it lets the key go while the picker is open.
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [serverErrors, setServerErrors] = React.useState<Record<string, string> | undefined>();
  const editMutation = useEditMember();

  const save = customFieldSave(editor, opened);
  const validationErrors = getCustomFieldValidationErrors(save);
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

  // Pristine editors dismiss freely (outside click, Escape); one holding an unsaved edit refuses
  // casual dismissal, and Cancel is the one explicit way to discard, so what was typed or picked
  // can't be lost to a stray key or click.
  const isDirty = isEdited(editor, opened.editor);

  const onSave = () => {
    if (editMutation.isPending) {
      return;
    }
    // Nothing to save means no PUT at all. The merge is keyed on the field, so a no-op save
    // would still declare a member change and fire member.edited (webhooks, audit) for a value
    // that didn't move. Mirrors the page-level save's dirty gate.
    if (save === undefined) {
      onClose();
      return;
    }
    if (Object.keys(validationErrors).length > 0) {
      setSaveAttempted(true);
      return;
    }
    editMutation.mutate(buildCustomFieldSavePayload(memberId, save), {
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
          if (isDirty || editMutation.isPending || pickerOpen) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (isDirty || editMutation.isPending) {
            event.preventDefault();
          }
        }}
        // The value's own input, rather than whatever comes first: in a list's editor that is
        // the remove button on its first chip, which a stray Enter would act on. A value in
        // parts has no input of that id, and its first part gets focus as before.
        onOpenAutoFocus={(event) => {
          const input = document.getElementById(inputId);
          if (input) {
            event.preventDefault();
            input.focus();
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
            editor={editor}
            errors={inputErrors}
            inputId={inputId}
            onChange={(next) => {
              setServerErrors(undefined);
              setEditor(next);
            }}
            onOpenChange={setPickerOpen}
          />
          <ErrorMessage message={inputErrors['']} />
        </div>
        <DialogFooter>
          <Button disabled={editMutation.isPending} variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={editMutation.isPending} onClick={onSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// How many fields show before the rest collapse behind "Show all": Settings' preview size.
const PREVIEW_COUNT = 5;

/** Whether a leaf's text is written in a textarea, so it can hold line breaks. */
const isMultiline = (leaf: Leaf) =>
  matchLeaf(leaf, {
    text: ({ format }) => TEXT_CONTROL[format] === 'textarea',
    choice: () => false,
  });

// select-text: button text is unselectable by default, and values (addresses especially) get
// copied.
const TextValue: React.FC<{ text: string; multiline?: boolean }> = ({ text, multiline }) => (
  <span
    className={cn(
      'break-words select-text in-data-[admin7-design=true]:text-md',
      // Text written in a textarea keeps its line breaks: pre-line shows them and still collapses
      // runs of spaces, as the rest of the screen's text does. A long one shows its first four
      // lines, since the row opens the editor, which shows all of it.
      multiline ? 'line-clamp-4 whitespace-pre-line' : 'block',
    )}
  >
    {text}
  </span>
);

// A list's answers as the chips its editor shows, since an option can hold a comma and a
// comma-joined line would split it.
const ListAnswers: React.FC<{ answers: readonly string[] }> = ({ answers }) => (
  <span className="mt-1 flex flex-wrap gap-1 select-text">
    {answers.map((answer) => (
      <Badge
        key={answer}
        className={cn(tokenFieldClasses.chip, 'cursor-[inherit] bg-secondary pr-2')}
        variant="outline"
        asChild
      >
        <span>{answer}</span>
      </Badge>
    ))}
  </span>
);

/**
 * What a member holds in a field, read as it is stored and drawn by the field's shape, or a dash
 * when they hold nothing. The editor starts from only the options a list still offers, but an
 * answer to one it no longer offers is still theirs, so it is shown here.
 */
const CustomFieldValue: React.FC<{ field: MemberCustomField; stored: unknown }> = ({
  field,
  stored,
}) => {
  const text = formatMemberCustomFieldValue(field, stored);
  if (!text) {
    return (
      <span className="block text-muted-foreground in-data-[admin7-design=true]:text-md">–</span>
    );
  }
  return matchShape<React.ReactElement>(field.type, {
    scalar: ({ leaf }) => <TextValue multiline={isMultiline(leaf)} text={text} />,
    record: () => <TextValue text={text} />,
    set: () => (
      <ListAnswers
        answers={
          Array.isArray(stored)
            ? stored.filter((answer): answer is string => typeof answer === 'string')
            : []
        }
      />
    ),
  });
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
  const admin7Design = useFeatureFlag('admin7Design');
  const { data, isLoading } = useCustomFieldDefinitions();
  const fields = data ?? [];
  const [editingField, setEditingField] = React.useState<MemberCustomField | null>(null);
  const [showAll, setShowAll] = React.useState(false);
  const listRef = React.useRef<HTMLUListElement>(null);

  // "Show all" leaves with its click, so focus moves to the first field it revealed rather than
  // dropping back to the page.
  React.useEffect(() => {
    if (showAll) {
      listRef.current?.children[PREVIEW_COUNT]?.querySelector('button')?.focus();
    }
  }, [showAll]);

  if (isLoading || fields.length === 0) {
    return null;
  }

  // A long list of fields collapses behind "Show all", as it does in Settings, so the rest of the
  // member's record stays in reach.
  const isTruncated = !showAll && fields.length > PREVIEW_COUNT;
  const visibleFields = isTruncated ? fields.slice(0, PREVIEW_COUNT) : fields;

  return (
    <section
      aria-labelledby="member-custom-fields-heading"
      className="flex flex-col gap-3"
      data-testid="member-custom-fields-field"
    >
      <h3 className="section-heading text-base font-semibold" id="member-custom-fields-heading">
        Custom fields
      </h3>
      <Card variant={admin7Design ? 'ruled' : 'outline'}>
        {/* Rows are uniform (py-3, no first/last trims) so hover chips are all
                    the same height; the card's vertical padding is what gives the
                    first and last chips breathing room from the card edge. */}
        <CardContent className={admin7Design ? 'pt-3' : 'px-6 py-4'}>
          <ul ref={listRef}>
            {visibleFields.map((field) => {
              const stored = metafields?.[field.namespace]?.[field.key];
              // Null rather than an empty line, so an unset value has no value in the label.
              const display = formatMemberCustomFieldValue(field, stored) || null;
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
                    className="group -mx-3 flex w-[calc(100%+--spacing(6))] items-center justify-between gap-4 rounded-md p-3 text-left transition-colors hover:bg-table-row-hover disabled:cursor-not-allowed disabled:opacity-50 in-data-[admin7-design=true]:py-4"
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
                      <span className="block text-sm text-muted-foreground in-data-[admin7-design=true]:text-base">
                        {field.name}
                      </span>
                      <CustomFieldValue field={field} stored={stored} />
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
          {/* The divider fades with the last row's hover, as the lines between rows do. */}
          {isTruncated && (
            <div className="border-t border-border pt-3 transition-colors [ul:has(>li:last-child:hover)+&]:border-t-transparent">
              <Button size="sm" type="button" variant="outline" onClick={() => setShowAll(true)}>
                Show all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {editingField && (
        <MemberCustomFieldEditModal
          key={editingField.key}
          field={editingField}
          held={metafields?.[editingField.namespace]?.[editingField.key]}
          memberId={memberId}
          onClose={() => setEditingField(null)}
        />
      )}
    </section>
  );
};

export default MemberCustomFieldsField;
