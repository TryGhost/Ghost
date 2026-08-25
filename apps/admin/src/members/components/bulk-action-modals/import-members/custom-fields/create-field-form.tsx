import {
  Button,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { CustomFieldTypeOption } from '@/shared/member-custom-fields/custom-field-type-option';
import { memberCustomFieldUserTypes } from '@tryghost/admin-x-framework/api/member-custom-fields';
import { suggestedFieldName } from '@/members/components/bulk-action-modals/import-members/custom-fields/mapping';
import { useEffect, useRef, useState } from 'react';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

interface CreateFieldFormProps {
  // The CSV column this field is being created for. Seeds the name, since a header is
  // usually close to what the publisher would have called the field anyway.
  columnKey: string;
  // The request in flight and what came back of it. Owned by the step, which runs the
  // create: this asks for a field and shows what it is told, and knows nothing about how
  // either happens.
  isSaving: boolean;
  // On the name input, for a refusal the publisher can fix by typing.
  nameError: string | null;
  // Below the form, for one they cannot.
  saveError: string | null;
  // False once a refusal cannot be argued with — a site at its field ceiling — so the
  // button stops inviting the same doomed request.
  canRetry: boolean;
  onSubmit: (name: string, type: MemberCustomField['type']) => void;
  // Editing answers the last refusal: it was about what was there before.
  onEdit: () => void;
  onCancel: () => void;
}

/**
 * Name and type for a field being created mid-mapping.
 *
 * Holds only what is being typed. Whether a name is acceptable is the server's answer — it
 * owns the rule and the sentence for breaking it, and a copy here would be a second opinion
 * that could disagree.
 */
export function CreateFieldForm({
  columnKey,
  isSaving,
  nameError,
  saveError,
  canRetry,
  onSubmit,
  onEdit,
  onCancel,
}: CreateFieldFormProps) {
  const [name, setName] = useState(() => suggestedFieldName(columnKey));
  const [typeId, setTypeId] = useState(memberCustomFieldUserTypes[0].id);

  // Opened from a row that may sit at the bottom edge of the scroll area, in which case the
  // form lands below the fold and its buttons are out of reach. `nearest` scrolls only when
  // some of it is actually hidden, so a form that already fits doesn't move the table, and
  // the scroll margin below carries it clear of the edge rather than flush against it.
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    formRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  const submit = () => onSubmit(name, typeId);

  return (
    <div
      ref={formRef}
      className="scroll-mb-8 space-y-3"
      data-testid="import-create-custom-field"
      // The control this replaced was a Select, which ate Escape itself. Left to travel,
      // Escape reaches the import dialog and closes the whole thing from inside a form the
      // publisher was only trying to back out of.
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          // Swallowed but not acted on mid-save, matching the Cancel button beside it:
          // backing out of a create already in flight would leave its answer nowhere.
          if (!isSaving) {
            onCancel();
          }
          return;
        }
        // Enter submits, as it would in a form — there is no form element here because
        // this sits inside the import dialog's own, and nesting one is invalid.
        if (event.key === 'Enter' && !isSaving && canRetry) {
          event.preventDefault();
          submit();
        }
      }}
    >
      <FieldGroup className="flex-row flex-wrap items-start gap-3">
        <Field className="min-w-56 flex-1" data-invalid={Boolean(nameError) || undefined}>
          <FieldLabel className="text-sm!" htmlFor="import-custom-field-name">
            Name
          </FieldLabel>
          <Input
            aria-invalid={Boolean(nameError) || undefined}
            autoComplete="off"
            className="h-8 text-sm!"
            id="import-custom-field-name"
            placeholder="Enter custom field name"
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              onEdit();
            }}
          />
          {nameError && <FieldError>{nameError}</FieldError>}
        </Field>
        <Field className="w-44">
          <FieldLabel className="text-sm!">Type</FieldLabel>
          <Select
            value={typeId}
            onValueChange={(value) => setTypeId(value as MemberCustomField['type'])}
          >
            <SelectTrigger aria-label="Type" className="h-8 text-sm!">
              <SelectValue>
                <CustomFieldTypeOption type={typeId} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {memberCustomFieldUserTypes.map((userType) => (
                <SelectItem key={userType.id} value={userType.id}>
                  <CustomFieldTypeOption type={userType.id} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center gap-2 self-end pb-0.5">
          <Button disabled={isSaving} size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={isSaving || !canRetry} size="sm" onClick={submit}>
            {isSaving ? 'Saving' : 'Save'}
          </Button>
        </div>
      </FieldGroup>

      {saveError && (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
}
