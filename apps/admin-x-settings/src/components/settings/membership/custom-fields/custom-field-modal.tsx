import ConfirmationModal from '../../../confirmation-modal';
import CustomFieldIcon from './custom-field-icon';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Field, FieldDescription, FieldError, FieldGroup, FieldLabel, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {SettingsModal} from '@tryghost/shade/patterns';
import {ValidationError, getErrorMessage} from '@tryghost/admin-x-framework/errors';
import {memberCustomFieldUserTypes, useCreateMemberCustomField, useDeleteMemberCustomField, useEditMemberCustomField, userTypeForField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {toast} from 'sonner';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';

const typeOptions = memberCustomFieldUserTypes.map(userType => ({value: userType.id, label: userType.label}));

const userTypeById = (id: string) => memberCustomFieldUserTypes.find(userType => userType.id === id) || memberCustomFieldUserTypes[0];

// Fixed-width so option labels align in a column regardless of icon shape.
const TypeTile: React.FC<{userTypeId: string}> = ({userTypeId}) => (
    <span className='flex w-5 shrink-0 items-center justify-center'>
        <CustomFieldIcon className='size-4' type={userTypeById(userTypeId).id} />
    </span>
);

const renderTypeOption = (option: {label: string; value: string}) => (
    <span className='flex items-center gap-2'>
        <TypeTile userTypeId={option.value} />
        <span>{option.label}</span>
    </span>
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

    const isArchived = field?.status === 'archived';
    const selectedType = typeOptions.find(option => option.value === formState.userTypeId);

    // The modal's third action mirrors the field's state: an active field can
    // be archived, an archived one reactivated. Both confirm first (the
    // newsletters pattern) — they change what every collection surface shows.
    const archiveButton = (
        <Button className='text-destructive hover:text-destructive' size='sm' type='button' variant='ghost' onClick={() => {
            modal.remove();
            NiceModal.show(ConfirmationModal, {
                title: 'Archive custom field',
                prompt: <>
                    <div className='mb-6'>Your custom field <strong>{field!.name}</strong> will no longer show up on your members, collect new information, or appear in filters.</div>
                    <div>Values already collected for this field will remain unchanged.</div>
                </>,
                okLabel: 'Archive',
                okVariant: 'destructive',
                onOk: async (archiveModal) => {
                    try {
                        // Archiving is a status change over the same PUT a rename
                        // uses; DELETE is the permanent, values-destroying removal
                        // and only valid on an already-archived field.
                        await editField({key: field!.key, status: 'archived'});
                        archiveModal?.remove();
                        toast.success('Custom field archived');
                    } catch (e) {
                        toast.error('Failed to archive the custom field');
                        handleError(e, {withToast: false});
                    }
                }
            });
        }}>Archive</Button>
    );

    const reactivateButton = (
        <Button className='text-green hover:text-green' size='sm' type='button' variant='ghost' onClick={() => {
            modal.remove();
            NiceModal.show(ConfirmationModal, {
                title: 'Reactivate custom field',
                prompt: <>
                    <div className='mb-6'>Reactivating <strong>{field!.name}</strong> will immediately make it available again on your members, for collecting, and in filters.</div>
                    <div>Values already collected for this field will remain unchanged.</div>
                </>,
                okLabel: 'Reactivate',
                onOk: async (reactivateModal) => {
                    try {
                        await editField({key: field!.key, status: 'active'});
                        reactivateModal?.remove();
                        toast.success('Custom field reactivated');
                    } catch (e) {
                        toast.error('Failed to reactivate the custom field');
                        handleError(e, {withToast: false});
                    }
                }
            });
        }}>Reactivate</Button>
    );

    let leftButton;
    if (isEdit) {
        leftButton = isArchived ? reactivateButton : archiveButton;
    }

    // Permanent deletion hides behind the header menu — one deliberate click
    // away, mirroring the members page's actions menu and the API's own
    // two-step (only archived fields can be deleted). A visible red button
    // would put irreversible data loss on equal footing with Save.
    const confirmDeleteField = () => {
        modal.remove();
        NiceModal.show(ConfirmationModal, {
            title: 'Delete custom field',
            prompt: <><strong>{field!.name}</strong> and every value collected from your members will be permanently deleted from the database. This can&rsquo;t be undone.</>,
            okLabel: 'Delete',
            okVariant: 'destructive',
            onOk: async (deleteModal) => {
                try {
                    await deleteField(field!.key);
                    deleteModal?.remove();
                    toast.success('Custom field deleted');
                } catch (e) {
                    toast.error('Failed to delete the custom field');
                    handleError(e, {withToast: false});
                }
            }
        });
    };

    const archivedFieldMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button aria-label='Menu' size='icon' type='button' variant='ghost'>
                    <LucideIcon.Ellipsis />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='z-[9999]'>
                <DropdownMenuItem className='text-destructive focus:text-destructive' onSelect={confirmDeleteField}>
                    <LucideIcon.Trash2 className='size-4' />
                    Delete custom field
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <SettingsModal
            buttonsDisabled={okProps.disabled}
            cancelLabel={isEdit ? 'Close' : 'Cancel'}
            leftButton={leftButton}
            okLabel={okProps.label || 'Save'}
            okVariant={okProps.variant}
            size='sm'
            testId='custom-field-modal'
            title={isEdit ? 'Edit custom field' : 'Add custom field'}
            topRightContent={isArchived ? archivedFieldMenu : undefined}
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
            <FieldGroup className='mt-10 gap-8 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                <Field data-invalid={Boolean(errors.name) || undefined}>
                    <FieldLabel htmlFor='custom-field-name'>Name</FieldLabel>
                    <Input aria-invalid={Boolean(errors.name) || undefined} autoComplete='off' id='custom-field-name' placeholder='Enter custom field name' value={formState.name} autoFocus onChange={e => updateForm(state => ({...state, name: e.target.value}))} onKeyDown={() => clearError('name')} />
                    {errors.name && <FieldError>{errors.name}</FieldError>}
                </Field>
                <Field data-disabled={isEdit || undefined}>
                    <FieldLabel>Type</FieldLabel>
                    <Select disabled={isEdit} value={formState.userTypeId} onValueChange={(value) => {
                        updateForm(state => ({...state, userTypeId: userTypeById(value).id}));
                    }}>
                        <SelectTrigger aria-label='Type' data-testid='custom-field-type'>
                            <SelectValue placeholder='Select type'>{selectedType && renderTypeOption(selectedType)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {typeOptions.map(option => <SelectItem key={option.value} value={option.value}>{renderTypeOption(option)}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {isEdit && <FieldDescription>Type can’t be changed after creation</FieldDescription>}
                </Field>
            </FieldGroup>
        </SettingsModal>
    );
});

export default CustomFieldModal;
