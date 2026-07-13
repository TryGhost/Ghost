import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {ConfirmationModal, Form, Modal, Select, type SelectOption, TextField, showToast} from '@tryghost/admin-x-design-system';
import {type OptionProps, type SingleValueProps, components} from 'react-select';
import {ValidationError} from '@tryghost/admin-x-framework/errors';
import {memberCustomFieldUserTypes, useBrowseMemberCustomFields, useCreateMemberCustomField, useDeleteMemberCustomField, useEditMemberCustomField, userTypeForField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';

const typeOptions: SelectOption[] = memberCustomFieldUserTypes.map(userType => ({value: userType.id, label: userType.label}));

const userTypeById = (id: string) => memberCustomFieldUserTypes.find(userType => userType.id === id) || memberCustomFieldUserTypes[0];

const TypeTile: React.FC<{userTypeId: string}> = ({userTypeId}) => (
    <span className='shrink-0 font-semibold'>
        {userTypeById(userTypeId).iconText}
    </span>
);

// Render the type's icon tile inside the select control and its dropdown options
const TypeSingleValue: React.FC<SingleValueProps<SelectOption, false>> = ({children, ...optionProps}) => (
    <components.SingleValue {...optionProps}>
        <span className='flex items-center gap-2'>
            <TypeTile userTypeId={optionProps.data.value} />
            <span>{children}</span>
        </span>
    </components.SingleValue>
);

const TypeOption: React.FC<OptionProps<SelectOption, false>> = ({children, ...optionProps}) => (
    <components.Option {...optionProps}>
        <span className='flex items-center gap-2'>
            <TypeTile userTypeId={optionProps.data.value} />
            <span>{children}</span>
        </span>
    </components.Option>
);

// The API requires an explicit, immutable key (lowercase letters, numbers and
// underscores, starting with a letter). Publishers never see it here - it's
// derived from the name on creation.
const deriveKey = (name: string) => name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .replace(/_+$/, '');

// Keys are immutable while names can be re-used by renames, so a fresh name can
// still collide with an old key (create "Company", rename it to "Team", create
// "Company" again). Suffix like Ghost's tag/label slugs (company, company_2, ...)
// - underscores because the key format doesn't allow hyphens.
const availableKey = (name: string, takenKeys: Set<string>) => {
    const base = deriveKey(name);
    if (!takenKeys.has(base)) {
        return base;
    }
    let suffix = 2;
    while (takenKeys.has(`${base}_${suffix}`)) {
        suffix += 1;
    }
    return `${base}_${suffix}`;
};

const CustomFieldModal = NiceModal.create<{field?: MemberCustomField}>(({field}) => {
    const modal = useModal();
    const {data: fieldsData} = useBrowseMemberCustomFields();
    const {mutateAsync: createField} = useCreateMemberCustomField();
    const {mutateAsync: editField} = useEditMemberCustomField();
    const {mutateAsync: deleteField} = useDeleteMemberCustomField();
    const handleError = useHandleError();
    const isEdit = Boolean(field);

    // The list is already cached from the settings group that opened this modal
    const existingFields = (fieldsData?.member_custom_fields || []).filter(existing => existing.id !== field?.id);

    const {formState, updateForm, handleSave, errors, clearError, setErrors, okProps} = useForm({
        initialState: {
            name: field?.name || '',
            // Form state tracks the user-type id; it maps to the API storage
            // type on save
            userTypeId: field ? userTypeForField(field).id : memberCustomFieldUserTypes[0].id
        },
        savingDelay: 500,
        onValidate: (state) => {
            const newErrors: Record<string, string> = {};
            const name = state.name.trim();
            if (!name) {
                newErrors.name = 'Enter a name for the field';
            } else if (!field && !deriveKey(name)) {
                newErrors.name = 'Enter a name with at least one letter';
            } else if (existingFields.some(existing => existing.name.toLowerCase() === name.toLowerCase())) {
                newErrors.name = 'A field with this name already exists';
            }
            return newErrors;
        },
        onSave: async (state) => {
            if (field) {
                await editField({id: field.id, name: state.name.trim()});
            } else {
                const takenKeys = new Set(existingFields.map(existing => existing.key));
                await createField({key: availableKey(state.name, takenKeys), name: state.name.trim(), type: userTypeById(state.userTypeId).apiType});
            }
        },
        onSaveError: (error) => {
            // Backstop for key races (e.g. another admin created a colliding key
            // after our list was fetched) - surface it on the Name field since
            // the key is derived from it
            if (error instanceof ValidationError && error.data?.errors?.[0]?.property === 'key') {
                setErrors({name: 'A field with a conflicting key already exists. Try a different name.'});
                return;
            }
            handleError(error);
        }
    });

    const selectedType = typeOptions.find(option => option.value === formState.userTypeId);

    const leftButtonProps = isEdit ? {
        label: 'Delete',
        link: true,
        color: 'red' as const,
        size: 'sm' as const,
        onClick: () => {
            modal.remove();
            NiceModal.show(ConfirmationModal, {
                title: 'Delete custom field',
                prompt: <>Deleting <strong>{field!.name}</strong> permanently removes the field and every value stored for it across all members. This can&rsquo;t be undone.</>,
                okLabel: 'Delete',
                okColor: 'red',
                onOk: async (deleteModal) => {
                    try {
                        await deleteField(field!.id);
                        deleteModal?.remove();
                        showToast({type: 'success', title: 'Custom field deleted'});
                    } catch (e) {
                        showToast({type: 'error', title: 'Failed to delete the custom field'});
                        handleError(e, {withToast: false});
                    }
                }
            });
        }
    } : undefined;

    return (
        <Modal
            buttonsDisabled={okProps.disabled}
            cancelLabel={isEdit ? 'Close' : 'Cancel'}
            leftButtonProps={leftButtonProps}
            okColor={okProps.color}
            okLabel={okProps.label || 'Save'}
            size='sm'
            testId='custom-field-modal'
            title={isEdit ? 'Edit custom field' : 'New custom field'}
            onOk={async () => {
                if (await handleSave()) {
                    modal.remove();
                }
            }}
        >
            <Form marginBottom={false} marginTop>
                <TextField
                    autoComplete='off'
                    error={Boolean(errors.name)}
                    hint={errors.name}
                    maxLength={191}
                    placeholder='Enter custom field name'
                    title='Name'
                    value={formState.name}
                    autoFocus
                    onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                    onKeyDown={() => clearError('name')}
                />
                <Select
                    components={{SingleValue: TypeSingleValue, Option: TypeOption}}
                    disabled={isEdit}
                    hint={isEdit ? 'Type can’t be changed after creation' : undefined}
                    options={typeOptions}
                    prompt='Select type'
                    selectedOption={selectedType}
                    title='Type'
                    onSelect={(option) => {
                        updateForm(state => ({...state, userTypeId: option?.value || memberCustomFieldUserTypes[0].id}));
                    }}
                />
            </Form>
        </Modal>
    );
});

export default CustomFieldModal;
