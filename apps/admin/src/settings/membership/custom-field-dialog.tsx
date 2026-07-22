import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Field,
    FieldDescription,
    FieldLabel,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { ValidationError, getErrorMessage } from "@tryghost/admin-x-framework/errors";
import {
    memberCustomFieldUserTypes,
    useCreateMemberCustomField,
    useDeleteMemberCustomField,
    useEditMemberCustomField,
    userTypeForField,
} from "@tryghost/admin-x-framework/api/member-custom-fields";
import { useForm } from "@tryghost/admin-x-framework/hooks";
import type { MemberCustomField } from "@tryghost/admin-x-framework/api/member-custom-fields";

import { CustomFieldTypeIcon } from "./custom-field-type-icon";
import { TextField } from "@/settings/app/shared/text-field";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The custom field create/edit dialog, ported from the legacy
 * custom-fields/custom-field-modal.tsx: name + immutable type, with
 * archive/reactivate as the third action and permanent deletion behind the
 * header menu on archived fields.
 */

const typeOptions = memberCustomFieldUserTypes.map((userType) => ({ value: userType.id, label: userType.label }));

const userTypeById = (id: string) => memberCustomFieldUserTypes.find((userType) => userType.id === id) || memberCustomFieldUserTypes[0];

const renderTypeOption = (option: { label: string; value: string }) => (
    <span className="flex items-center gap-2">
        <span className="flex w-5 shrink-0 items-center justify-center">
            <CustomFieldTypeIcon className="size-4" typeId={userTypeById(option.value).id} />
        </span>
        <span>{option.label}</span>
    </span>
);

export function CustomFieldDialog({ field, onClose }: { field?: MemberCustomField; onClose: () => void }) {
    const { confirm } = useConfirmation();
    const { mutateAsync: createField } = useCreateMemberCustomField();
    const { mutateAsync: editField } = useEditMemberCustomField();
    const { mutateAsync: deleteField } = useDeleteMemberCustomField();
    const handleError = useSettingsHandleError();
    const isEdit = Boolean(field);

    const { formState, updateForm, handleSave, errors, clearError, setErrors, okProps } = useForm({
        initialState: {
            name: field?.name || "",
            // Form state tracks the user-type id; it maps to the API storage
            // type on save
            userTypeId: field ? userTypeForField(field).id : memberCustomFieldUserTypes[0].id,
        },
        savingDelay: 500,
        onValidate: (state) => {
            // Name uniqueness is enforced by the API (globally unique); a 422
            // comes back through onSaveError and highlights the field. Here we
            // only guard the empty case so we never POST a blank name.
            const newErrors: Record<string, string> = {};
            if (!state.name.trim()) {
                newErrors.name = "Enter a name for the field";
            }
            return newErrors;
        },
        onSave: async (state) => {
            if (field) {
                await editField({ key: field.key, name: state.name.trim() });
            } else {
                // Just name and type: the backend mints the immutable key.
                await createField({ name: state.name.trim(), type: userTypeById(state.userTypeId).id });
            }
        },
        onSaveError: (error) => {
            // A field-level validation error from the API highlights its input;
            // anything else falls back to a toast. The human-readable text lives
            // in `context` (Ghost's error handler rewrites `message` to a generic
            // "cannot save ..." summary), so read it via getErrorMessage.
            if (error instanceof ValidationError && error.data?.errors?.[0]?.property === "name") {
                setErrors({ name: getErrorMessage(error, "Invalid name") });
                return;
            }
            handleError(error);
        },
    });

    const isArchived = field?.status === "archived";
    const selectedType = typeOptions.find((option) => option.value === formState.userTypeId);

    // The modal's third action mirrors the field's state: an active field can
    // be archived, an archived one reactivated. Both confirm first — they
    // change what every collection surface shows.
    const confirmArchive = () => {
        onClose();
        confirm({
            title: "Archive custom field",
            prompt: (
                <>
                    <div className="mb-6">Your custom field <strong>{field!.name}</strong> will no longer show up on your members, collect new information, or appear in filters.</div>
                    <div>Values already collected for this field will remain unchanged.</div>
                </>
            ),
            okLabel: "Archive",
            destructive: true,
            onOk: async () => {
                try {
                    // Archiving is a status change over the same PUT a rename
                    // uses; DELETE is the permanent, values-destroying removal
                    // and only valid on an already-archived field.
                    await editField({ key: field!.key, status: "archived" });
                    showToast({ type: "success", title: "Custom field archived" });
                } catch (e) {
                    showToast({ type: "error", title: "Failed to archive the custom field" });
                    handleError(e, { withToast: false });
                    throw e;
                }
            },
        });
    };

    const confirmReactivate = () => {
        onClose();
        confirm({
            title: "Reactivate custom field",
            prompt: (
                <>
                    <div className="mb-6">Reactivating <strong>{field!.name}</strong> will immediately make it available again on your members, for collecting, and in filters.</div>
                    <div>Values already collected for this field will remain unchanged.</div>
                </>
            ),
            okLabel: "Reactivate",
            onOk: async () => {
                try {
                    await editField({ key: field!.key, status: "active" });
                    showToast({ type: "success", title: "Custom field reactivated" });
                } catch (e) {
                    showToast({ type: "error", title: "Failed to reactivate the custom field" });
                    handleError(e, { withToast: false });
                    throw e;
                }
            },
        });
    };

    // Permanent deletion hides behind the header menu — one deliberate click
    // away, mirroring the API's own two-step (only archived fields can be
    // deleted). A visible red button would put irreversible data loss on
    // equal footing with Save.
    const confirmDeleteField = () => {
        onClose();
        confirm({
            title: "Delete custom field",
            prompt: <><strong>{field!.name}</strong> and every value collected from your members will be permanently deleted from the database. This can&rsquo;t be undone.</>,
            okLabel: "Delete",
            destructive: true,
            onOk: async () => {
                try {
                    await deleteField(field!.key);
                    showToast({ type: "success", title: "Custom field deleted" });
                } catch (e) {
                    showToast({ type: "error", title: "Failed to delete the custom field" });
                    handleError(e, { withToast: false });
                    throw e;
                }
            },
        });
    };

    let leftButton: React.ReactNode = null;
    if (isEdit) {
        leftButton = isArchived ? (
            <Button className="px-0 text-state-success hover:bg-transparent hover:underline" size="sm" variant="ghost" onClick={confirmReactivate}>Reactivate</Button>
        ) : (
            <Button className="px-0 text-destructive hover:bg-transparent hover:underline" size="sm" variant="ghost" onClick={confirmArchive}>Archive</Button>
        );
    }

    return (
        <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent aria-describedby={undefined} className="max-w-[480px] gap-0 p-0" data-testid="custom-field-modal">
                <div className="flex items-center justify-between px-7 pt-6">
                    <DialogTitle>{isEdit ? "Edit custom field" : "Add custom field"}</DialogTitle>
                    {isArchived && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-label="Menu" size="icon" variant="ghost">
                                    <LucideIcon.Ellipsis className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={confirmDeleteField}>
                                    <LucideIcon.Trash2 className="size-4" />
                                    Delete custom field
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                <div className="flex flex-col gap-6 px-7 py-6">
                    <TextField
                        autoComplete="off"
                        error={Boolean(errors.name)}
                        hint={errors.name}
                        placeholder="Enter custom field name"
                        title="Name"
                        value={formState.name}
                        onChange={(e) => updateForm((state) => ({ ...state, name: e.target.value }))}
                        onKeyDown={() => clearError("name")}
                    />
                    <Field data-disabled={isEdit || undefined}>
                        <FieldLabel>Type</FieldLabel>
                        <Select disabled={isEdit} value={formState.userTypeId} onValueChange={(value) => {
                            updateForm((state) => ({ ...state, userTypeId: userTypeById(value).id }));
                        }}>
                            <SelectTrigger aria-label="Type" data-testid="custom-field-type">
                                <SelectValue placeholder="Select type">{selectedType && renderTypeOption(selectedType)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {typeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{renderTypeOption(option)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {isEdit && <FieldDescription>Type can&rsquo;t be changed after creation</FieldDescription>}
                    </Field>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border px-7 py-4">
                    <div>{leftButton}</div>
                    <div className="flex items-center gap-2">
                        <Button disabled={okProps.disabled} variant="outline" onClick={onClose}>{isEdit ? "Close" : "Cancel"}</Button>
                        <Button
                            disabled={okProps.disabled}
                            variant={okProps.color === "red" ? "destructive" : "default"}
                            onClick={() => {
                                void (async () => {
                                    try {
                                        if (await handleSave()) {
                                            onClose();
                                        }
                                    } catch {
                                        // useForm has already passed the error to onSaveError,
                                        // which renders field validation or reports the failure.
                                    }
                                })();
                            }}
                        >
                            {okProps.label || "Save"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
