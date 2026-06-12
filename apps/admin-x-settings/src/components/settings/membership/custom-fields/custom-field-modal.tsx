import * as customFields from '../../../../../../../poc/custom-fields/repo';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {Button, ConfirmationModal, Form, Modal, Select, type SelectOption, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

interface CustomFieldModalProps {
    field?: customFields.FieldDefinition;
    refresh: () => void;
    // Called with the newly created field (create mode only). Lets a caller, e.g.
    // the signup Form fields list, place the new field right after creating it.
    onCreated?: (field: customFields.FieldDefinition) => void;
}

const typeOptions: SelectOption[] = customFields.TYPES.map(t => ({value: t.value, label: t.label}));

const CustomFieldModal: React.FC<CustomFieldModalProps> = ({field, refresh, onCreated}) => {
    const modal = useModal();
    const handleError = useHandleError();
    const isEdit = Boolean(field);

    const {formState, saveState, updateForm, handleSave, errors, clearError, okProps} = useForm({
        initialState: {
            label: field?.label || '',
            type: field?.type || ('text' as customFields.FieldType),
            // Optional placeholder; only used/persisted for text & number fields.
            placeholder: field?.placeholder || '',
            // Options editor state; only used/persisted when type is 'select'.
            options: field?.options?.length ? [...field.options] : ['', ''],
            multiple: field?.multiple || false
        },
        savingDelay: 500,
        savedDelay: 500,
        onValidate: (state) => {
            const newErrors: Record<string, string | undefined> = {};
            if (!state.label.trim()) {
                newErrors.label = 'Enter a name for the field';
            }
            if (!state.type) {
                newErrors.type = 'Select a data type';
            }
            if (state.type === 'select') {
                const trimmed = state.options.map(o => o.trim());
                if (trimmed.filter(Boolean).length < 2) {
                    newErrors.options = 'Add at least two options';
                } else if (trimmed.some(o => !o)) {
                    newErrors.options = 'Give every option a value, or remove the empty ones';
                }
            }
            return newErrors;
        },
        onSave: async (state) => {
            const options = state.options.map(o => o.trim()).filter(Boolean);
            // Placeholder is only meaningful for text/number; null otherwise.
            const placeholder = (state.type === 'text' || state.type === 'number') ? (state.placeholder.trim() || null) : null;
            if (field) {
                await customFields.updateField(field.id, {
                    label: state.label.trim(),
                    placeholder,
                    ...(state.type === 'select' ? {options, multiple: state.multiple} : {})
                });
            } else {
                const created = await customFields.createField({
                    label: state.label.trim(),
                    type: state.type,
                    placeholder,
                    options: state.type === 'select' ? options : null,
                    multiple: state.type === 'select' ? state.multiple : false
                });
                onCreated?.(created);
            }
        },
        onSaveError: handleError
    });

    const selectedType = typeOptions.find(o => o.value === formState.type);
    const isSelect = formState.type === 'select';
    const isTextual = formState.type === 'text' || formState.type === 'number';

    const updateOption = (index: number, value: string) => {
        updateForm(state => ({...state, options: state.options.map((o, i) => (i === index ? value : o))}));
        clearError('options');
    };
    const addOption = () => {
        clearError('options');
        updateForm(state => ({...state, options: [...state.options, '']}));
    };
    const removeOption = (index: number) => {
        clearError('options');
        updateForm(state => ({...state, options: state.options.filter((_, i) => i !== index)}));
    };

    const leftButtonProps = isEdit ? {
        label: 'Delete',
        link: true,
        color: 'red' as const,
        size: 'sm' as const,
        onClick: () => {
            modal.remove();
            NiceModal.show(ConfirmationModal, {
                title: 'Delete custom field',
                prompt: <>Deleting <strong>{field!.label}</strong> permanently removes the field and every value stored for it across all members. This can&rsquo;t be undone.</>,
                okLabel: 'Delete',
                okColor: 'red',
                onOk: async (deleteModal) => {
                    await customFields.deleteField(field!.id);
                    refresh();
                    deleteModal?.remove();
                }
            });
        }
    } : undefined;

    return <Modal
        afterClose={refresh}
        buttonsDisabled={okProps.disabled}
        cancelLabel={isEdit ? 'Close' : 'Cancel'}
        dirty={saveState === 'unsaved'}
        leftButtonProps={leftButtonProps}
        okColor={okProps.color}
        okLabel={okProps.label || 'Save'}
        size='sm'
        testId='custom-field-modal'
        title={isEdit ? 'Edit custom field' : 'New custom field'}
        stickyFooter
        onOk={async () => {
            // Save & close: closing after a successful save avoids re-saving (in
            // create mode that would spawn duplicate fields on every Save click).
            const saved = await handleSave({fakeWhenUnchanged: true});
            if (saved) {
                refresh();
                modal.remove();
            }
        }}
    >
        <Form marginBottom={false} marginTop>
            <TextField
                autoComplete='off'
                error={Boolean(errors.label)}
                hint={errors.label}
                maxLength={191}
                placeholder='Enter custom field name'
                title='Name'
                value={formState.label}
                autoFocus
                onChange={e => updateForm(state => ({...state, label: e.target.value}))}
                onKeyDown={() => clearError('label')}
            />
            <Select
                disabled={isEdit}
                error={Boolean(errors.type)}
                hint={isEdit ? 'Type can’t be changed after creation' : errors.type}
                options={typeOptions}
                prompt='Select data type'
                selectedOption={selectedType}
                title='Data type'
                onSelect={(option) => {
                    clearError('type');
                    updateForm(state => ({...state, type: (option?.value as customFields.FieldType) || 'text'}));
                }}
            />
            {isTextual && (
                <TextField
                    autoComplete='off'
                    hint='Optional example shown in the empty input'
                    maxLength={191}
                    placeholder='e.g. Acme Inc.'
                    title='Placeholder'
                    value={formState.placeholder}
                    onChange={e => updateForm(state => ({...state, placeholder: e.target.value}))}
                />
            )}
            {isSelect && (
                <>
                    <div className='flex flex-col gap-y-2'>
                        <span className='text-sm font-semibold text-grey-700 dark:text-grey-300'>Options</span>
                        {formState.options.map((option, index) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <div key={index} className='flex items-center gap-2'>
                                <div className='grow'>
                                    <TextField
                                        autoComplete='off'
                                        error={Boolean(errors.options) && !option.trim()}
                                        placeholder='Enter option'
                                        value={option}
                                        onChange={e => updateOption(index, e.target.value)}
                                    />
                                </div>
                                <Button
                                    disabled={formState.options.length <= 2}
                                    icon='trash'
                                    iconColorClass='text-grey-700'
                                    label='Remove option'
                                    size='sm'
                                    hideLabel
                                    link
                                    onClick={() => removeOption(index)}
                                />
                            </div>
                        ))}
                        {errors.options && <span className='text-xs text-red'>{errors.options}</span>}
                        <div>
                            <Button color='green' label='Add option' size='sm' link onClick={addOption} />
                        </div>
                    </div>
                    <Toggle
                        checked={formState.multiple}
                        direction='rtl'
                        label='Allow members to select more than one option'
                        onChange={e => updateForm(state => ({...state, multiple: e.target.checked}))}
                    />
                </>
            )}
        </Form>
    </Modal>;
};

export default NiceModal.create(CustomFieldModal);
