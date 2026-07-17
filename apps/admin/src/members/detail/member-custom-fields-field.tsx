import React from 'react';
import {Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, LoadingIndicator, Textarea} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {dequal} from 'dequal';
import {ADDRESS_SUBFIELD_KEYS, buildCustomFieldSavePayload, getCustomFieldValidationErrors, getEditableCustomFieldValues, parseCustomFieldServerErrors} from './member-detail-edit';
import {formatAddressValue} from './member-detail-format';
import {toast} from 'sonner';
import {useBrowseMemberCustomFields, userTypeForField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {useEditMember} from '@tryghost/admin-x-framework/api/members';
import type {EditableAddressValue, EditableCustomFieldValue} from './member-detail-edit';
import type {MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';

interface MemberCustomFieldsFieldProps {
    memberId: string;
    // The member's saved values (`member.custom_fields` from the read), keyed
    // by field key. Server truth — edits never live on the page draft; each
    // field saves individually through its own editor.
    customFields: Record<string, unknown> | undefined;
    disabled?: boolean;
}

const ADDRESS_SUBFIELD_LABELS: Record<typeof ADDRESS_SUBFIELD_KEYS[number], string> = {
    line1: 'Address line 1',
    line2: 'Address line 2',
    city: 'City',
    state: 'State',
    postal_code: 'Postal code',
    country: 'Country'
};

// role='alert': after a save-attempt these render while focus stays on the Save
// button, so an assertive live region is the only way a screen reader hears the
// failure.
const ErrorMessage: React.FC<{message?: string}> = ({message}) => {
    return message ? <p className='text-sm text-destructive' role='alert'>{message}</p> : null;
};

// The address composite: one input per sub-field, paired into a two-column
// sub-grid. Country is a plain two-letter code input for now; the shared
// AddressValue schema only shape-checks it, and a proper country select is a
// follow-up.
const AddressInput: React.FC<{
    inputId: string;
    value: EditableAddressValue;
    // Messages keyed by sub-field (`line1`, `postal_code`, …).
    errors?: Record<string, string>;
    disabled?: boolean;
    onChange: (value: EditableAddressValue) => void;
}> = ({inputId, value, errors, disabled, onChange}) => {
    return (
        <div className='grid gap-x-4 gap-y-3 md:grid-cols-2'>
            {ADDRESS_SUBFIELD_KEYS.map((subfield) => {
                const subfieldId = `${inputId}-${subfield}`;
                const error = errors?.[subfield];
                return (
                    <div key={subfield} className='flex flex-col gap-1.5'>
                        <Label htmlFor={subfieldId}>{ADDRESS_SUBFIELD_LABELS[subfield]}</Label>
                        <Input
                            aria-invalid={error ? true : undefined}
                            disabled={disabled}
                            id={subfieldId}
                            value={value[subfield] ?? ''}
                            onChange={e => onChange({...value, [subfield]: e.target.value})}
                        />
                        <ErrorMessage message={error} />
                    </div>
                );
            })}
        </div>
    );
};

// The control for one field, picked from the presentation catalog's `input`
// hint — the same hint the collection forms render from, so the editor and
// the member-facing forms never diverge per type. Unknown future inputs
// render nothing rather than degrading to a wrong text input.
const CustomFieldInput: React.FC<{
    field: MemberCustomField;
    inputId: string;
    value: EditableCustomFieldValue;
    // Messages for this field: '' = the field itself, 'subfield' = a composite sub-field.
    errors?: Record<string, string>;
    disabled?: boolean;
    onChange: (value: EditableCustomFieldValue) => void;
}> = ({field, inputId, value, errors, disabled, onChange}) => {
    const fieldError = errors?.[''];
    switch (userTypeForField(field).input) {
    case 'text':
        return <Input aria-invalid={fieldError ? true : undefined} disabled={disabled} id={inputId} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} />;
    case 'textarea':
        // max-w-full: Ember's unlayered global CSS sets `textarea { max-width: 500px }`
        // (ghost/admin patterns/forms.css) and it bleeds into the React island.
        return <Textarea aria-invalid={fieldError ? true : undefined} className='max-w-full resize-y' disabled={disabled} id={inputId} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} />;
    case 'address':
        return (
            <AddressInput
                disabled={disabled}
                errors={errors}
                inputId={inputId}
                value={typeof value === 'object' && value !== null ? value : {}}
                onChange={onChange}
            />
        );
    default:
        return null;
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
}> = ({memberId, field, initialValue, onClose}) => {
    const isAddressField = userTypeForField(field).input === 'address';
    const [value, setValue] = React.useState<EditableCustomFieldValue>(
        initialValue ?? (isAddressField ? {} : '')
    );
    const [saveAttempted, setSaveAttempted] = React.useState(false);
    const [serverErrors, setServerErrors] = React.useState<Record<string, string> | undefined>();
    const editMutation = useEditMember();

    const validationErrors = getCustomFieldValidationErrors({[field.key]: value}, [field]);
    const errors = {...(saveAttempted ? validationErrors : {}), ...serverErrors};
    // Strip this field's key prefix so the input sees '' / 'subfield' keys.
    const inputErrors = Object.fromEntries(
        Object.entries(errors).map(([key, message]) => [key === field.key ? '' : key.slice(field.key.length + 1), message])
    );

    const inputId = `member-custom-field-${field.key}`;

    // Pristine editors dismiss freely (outside click, Escape); a dirty one
    // refuses casual dismissal — Cancel is the one explicit way to discard,
    // so typed values can never be lost by a stray click.
    const isDirty = !dequal(
        getEditableCustomFieldValues({[field.key]: value}),
        getEditableCustomFieldValues({[field.key]: initialValue})
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
        editMutation.mutate(buildCustomFieldSavePayload(memberId, field.key, value), {
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
            }
        });
    };

    return (
        <Dialog open onOpenChange={(open) => {
            // Never dismiss while the save is in flight: closing here would let
            // the field be reopened and saved again, racing two PUTs whose order
            // isn't guaranteed. A dirty editor also refuses casual dismissal.
            if (!open && !editMutation.isPending) {
                onClose();
            }
        }}>
            <DialogContent
                data-testid='member-custom-field-edit-modal'
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
                <div className='flex flex-col gap-1.5'>
                    {/* The dialog title names the field visually; this gives the
                        scalar control a real label association (address sub-fields
                        carry their own labels). */}
                    {!isAddressField && (
                        <Label className='sr-only' htmlFor={inputId}>{field.name}</Label>
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
                    <Button disabled={editMutation.isPending} variant='outline' onClick={onClose}>Cancel</Button>
                    <Button className='min-w-16' disabled={editMutation.isPending} onClick={onSave}>
                        {editMutation.isPending ? <><LoadingIndicator size='sm' /><span className='sr-only'>Saving</span></> : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

/** One readable line per value; address collapses to a formatted string. */
function formatValue(value: EditableCustomFieldValue | undefined): string | null {
    if (value === undefined) {
        return null;
    }
    if (typeof value === 'string') {
        return value;
    }
    return formatAddressValue(value) || null;
}

/**
 * The Custom fields section of the member detail screen: a read-only list of
 * the member's values, one row per field defined in Settings. This screen is
 * a record, not a form — an admin's daily relationship to this data is
 * reading it, so nothing here is a hot input. Editing is a deliberate act:
 * the pencil opens a per-field editor with its own Save. Owns its external
 * heading + card so it hides entirely (returning null) when the site has no
 * fields — the Settings section is the entry point for defining them.
 */
const MemberCustomFieldsField: React.FC<MemberCustomFieldsFieldProps> = ({memberId, customFields, disabled}) => {
    const {data, isLoading} = useBrowseMemberCustomFields();
    const fields = data?.members_custom_fields ?? [];
    const values = getEditableCustomFieldValues(customFields);
    const [editingField, setEditingField] = React.useState<MemberCustomField | null>(null);

    if (isLoading || fields.length === 0) {
        return null;
    }

    return (
        <section aria-labelledby='member-custom-fields-heading' className='flex flex-col gap-3' data-testid='member-custom-fields-field'>
            <h3 className='text-base font-semibold' id='member-custom-fields-heading'>Custom fields</h3>
            <Card>
                {/* Rows are uniform (py-3, no first/last trims) so hover chips are all
                    the same height; the card's vertical padding is what gives the
                    first and last chips breathing room from the card edge. */}
                <CardContent className='px-6 py-4'>
                    <ul>
                        {fields.map((field) => {
                            const display = formatValue(values[field.key]);
                            return (
                                // Dividers fade around the hovered row (its own border-b, and the
                                // previous row's via :has), so the hover tint floats free of the
                                // lines — the same effect as the settings list rows.
                                <li key={field.key} className='border-b border-border transition-colors last:border-b-0 hover:border-b-transparent [&:has(+li:hover)]:border-b-transparent'>
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
                                        className='group -mx-3 flex w-[calc(100%+1.5rem)] items-center justify-between gap-4 rounded-md px-3 py-3 text-left transition-colors hover:bg-table-row-hover disabled:cursor-not-allowed disabled:opacity-50'
                                        disabled={disabled}
                                        type='button'
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
                                        <span className='min-w-0'>
                                            <span className='block text-sm text-muted-foreground'>{field.name}</span>
                                            {/* select-text: button text is unselectable by default,
                                                and values (addresses especially) get copied. */}
                                            {display ? (
                                                <span className='block break-words select-text'>{display}</span>
                                            ) : (
                                                <span className='block text-muted-foreground'>–</span>
                                            )}
                                        </span>
                                        <LucideIcon.Pen aria-hidden='true' className='shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-focus-visible:opacity-100' size={16} />
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
                    initialValue={values[editingField.key]}
                    memberId={memberId}
                    onClose={() => setEditingField(null)}
                />
            )}
        </section>
    );
};

export default MemberCustomFieldsField;
