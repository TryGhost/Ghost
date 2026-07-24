import { toast } from "sonner";
import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@tryghost/shade/components";
import { type Recommendation, useDeleteRecommendation, useEditRecommendation } from "@tryghost/admin-x-framework/api/recommendations";
import { useForm } from "@tryghost/admin-x-framework/hooks";

import { RecommendationDescriptionForm } from "./recommendation-description-form";
import { validateDescriptionForm } from "./recommendation-validation";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";

/**
 * The edit-recommendation dialog, ported from the legacy
 * edit-recommendation-modal.tsx. Not routed — like the legacy list, it opens
 * from a row click with the already-loaded recommendation (no refetch) and
 * has no deep link.
 */
export function EditRecommendationDialog({ recommendation, onClose }: {
    recommendation: Recommendation;
    onClose: () => void;
}) {
    const { mutateAsync: editRecommendation } = useEditRecommendation();
    const { mutateAsync: deleteRecommendation } = useDeleteRecommendation();
    const handleError = useSettingsHandleError();
    const { confirm } = useConfirmation();

    const { formState, updateForm, handleSave, errors, clearError, setErrors, okProps } = useForm({
        initialState: {
            ...recommendation,
        },
        savingDelay: 500,
        savedDelay: 500,
        onSave: async (state) => {
            await editRecommendation(state);
        },
        onSaveError: handleError,
        onValidate: (state) => {
            return validateDescriptionForm(state);
        },
    });

    const confirmDelete = () => {
        onClose();
        confirm({
            title: "Delete recommendation",
            prompt: <p>Your recommendation <strong>{recommendation.title}</strong> will no longer be visible to your audience.</p>,
            okLabel: "Delete",
            destructive: true,
            onOk: async () => {
                try {
                    await deleteRecommendation(recommendation);
                } catch (e) {
                    showToast({
                        title: "Failed to delete the recommendation",
                        message: "Please try again later.",
                        type: "error",
                    });
                    handleError(e, { withToast: false });
                    throw e;
                }
            },
        });
    };

    const onOk = async () => {
        toast.dismiss();
        try {
            await handleSave({ force: true });
        } catch {
            showToast({
                title: "Something went wrong",
                type: "error",
                message: "Please try again later.",
            });
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] max-w-[540px] overflow-y-auto" data-testid="edit-recommendation-modal">
                <DialogHeader>
                    <DialogTitle>Edit recommendation</DialogTitle>
                </DialogHeader>
                <RecommendationDescriptionForm clearError={clearError} errors={errors} formState={formState} setErrors={setErrors} showURL={true} updateForm={updateForm} />
                <DialogFooter className="sm:justify-between">
                    <Button className="px-0 text-destructive" variant="link" onClick={confirmDelete}>Delete</Button>
                    <div className="flex gap-2">
                        <Button disabled={okProps.disabled} variant="outline" onClick={onClose}>Close</Button>
                        <Button disabled={okProps.disabled} onClick={() => void onOk()}>{okProps.label || "Save"}</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
