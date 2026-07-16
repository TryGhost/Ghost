import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {ConfirmationModal, Form, Icon, Modal, Select, type SelectOption, TextField, showToast} from '@tryghost/admin-x-design-system';
import {type OptionProps, type SingleValueProps, components} from 'react-select';
import {ValidationError, getErrorMessage} from '@tryghost/admin-x-framework/errors';
import {memberCustomFieldUserTypes, useCreateMemberCustomField, useDeleteMemberCustomField, useEditMemberCustomField, userTypeForField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';

const typeOptions: SelectOption[] = memberCustomFieldUserTypes.map(userType => ({value: userType.id, label: userType.label}));

const userTypeById = (id: string) => memberCustomFieldUserTypes.find(userType => userType.id === id) || memberCustomFieldUserTypes[0];

// Fixed-width so option labels align in a column regardless of icon shape.
const TypeTile: React.FC<{userTypeId: string}> = ({userTypeId}) => (
    <span className='flex w-5 shrink-0 items-center justify-center'>
        <Icon name={userTypeById(userTypeId).icon} size='sm' />
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

const CustomFieldModal = NiceModal.create<{field?: MemberCustomField}>(({field}) => {
    const modal = useModal();
    const {mutateAsync: createField} = useCreateMemberCustomField();
    const {mutateAsync: editField} = useEditMemberCustomField();
    const {mutateAsync: deleteField} = useDeleteMemberCustomField();
    const handleError = useHandleError();
    const isEdit = Boolean(field);

    const {formState, updateForm, handleSave, errors, clearError, setErrors, okProps} = useForm({
        initialState: {
            name: field?.name || '',
            // Form state tracks the user-type id; it maps to the API storage
            // type on save
            userTypeId: field ? userTypeForField(field).id : memberCustomFieldUserTypes[0].id
        },
        savingDelay: 500,
        onValidate: (state) => {
            // Name uniqueness is enforced by the API (globally unique); a 422
            // comes back through onSaveError and highlights the field. Here we
            // only guard the empty case so we never POST a blank name.
            const newErrors: Record<string, string> = {};
            if (!state.name.trim()) {
                newErrors.name = 'Enter a name for the field';
            }
            return newErrors;
        },
        onSave: async (state) => {
            if (field) {
                await editField({key: field.key, name: state.name.trim()});
            } else {
                // Just name and type: the backend mints the immutable key.
                await createField({name: state.name.trim(), type: userTypeById(state.userTypeId).id});
            }
        },
        onSaveError: (error) => {
            // A field-level validation error from the API highlights its input;
            // anything else falls back to a toast. The human-readable text lives
            // in `context` (Ghost's error handler rewrites `message` to a generic
            // "cannot save ..." summary), so read it via getErrorMessage.
            if (error instanceof ValidationError && error.data?.errors?.[0]?.property === 'name') {
                setErrors({name: getErrorMessage(error, 'Invalid name')});
                return;
            }
            handleError(error);
        }
    });

    const selectedType = typeOptions.find(option => option.value === formState.userTypeId);

    const leftButtonProps = isEdit ? {
        label: 'Archive',
        link: true,
        color: 'red' as const,
        size: 'sm' as const,
        onClick: () => {
            modal.remove();
            NiceModal.show(ConfirmationModal, {
                title: 'Archive custom field',
                prompt: <>Archiving <strong>{field!.name}</strong> removes it from your custom fields. Its key stays reserved so it can&rsquo;t be reused, and this can&rsquo;t be undone.</>,
                okLabel: 'Archive',
                okColor: 'red',
                onOk: async (deleteModal) => {
                    try {
                        await deleteField(field!.key);
                        deleteModal?.remove();
                        showToast({type: 'success', title: 'Custom field archived'});
                    } catch (e) {
                        showToast({type: 'error', title: 'Failed to archive the custom field'});
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
                try {
                    if (await handleSave()) {
                        modal.remove();
                    }
                } catch {
                    // useForm has already passed the error to onSaveError, which
                    // renders field validation or reports an unexpected failure.
                }
            }}
        >
            <Form marginBottom={false} marginTop>
                <TextField
                    autoComplete='off'
                    error={Boolean(errors.name)}
                    hint={errors.name}
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
                    menuPosition='fixed'
                    options={typeOptions}
                    prompt='Select type'
                    selectedOption={selectedType}
                    testId='custom-field-type'
                    title='Type'
                    onSelect={(option) => {
                        // Resolve the select's string value back through the catalog
                        // so form state holds a real field type, not a loose string.
                        updateForm(state => ({...state, userTypeId: userTypeById(option?.value ?? '').id}));
                    }}
                />
            </Form>
        </Modal>
    );
});

export default CustomFieldModal;
