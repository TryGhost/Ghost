import { useEffect } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
    Switch,
    Textarea,
} from "@tryghost/shade/components";
import { formatNumber } from "@tryghost/shade/utils";
import { useAddNewsletter } from "@tryghost/admin-x-framework/api/newsletters";
import { useBrowseMembers } from "@tryghost/admin-x-framework/api/members";
import { useForm } from "@tryghost/admin-x-framework/hooks";
import { useNavigate } from "@tryghost/admin-x-framework";

import { TextField } from "@/settings/app/shared/text-field";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { useSettingsHandleError } from "@/settings/app/shared/toast";
import { HostLimitError, useLimiter } from "@/settings/app/shared/use-limiter";

/**
 * The routed create-newsletter dialog (`/settings/newsletters/new`), ported
 * from the legacy add-newsletter-modal.tsx: name/description with the
 * opt-in-existing-subscribers switch, guarded by the newsletters host limit
 * (limit modal + bounce back, like the legacy LimitModal flow).
 */
export function AddNewsletterDialog() {
    const navigate = useNavigate();
    const { showLimit } = useConfirmation();
    const hasAutomations = useFeatureFlag("automations");
    const returnRoute = hasAutomations ? "/settings/emails" : "/settings/newsletters";
    const handleError = useSettingsHandleError();
    const limiter = useLimiter();

    const { data: members } = useBrowseMembers({
        searchParams: { filter: "newsletters.status:active+email_disabled:0", limit: "1", page: "1", include: "newsletters,labels" },
    });

    const { mutateAsync: addNewsletter } = useAddNewsletter();
    const { formState, updateForm, saveState, handleSave, errors, clearError } = useForm({
        initialState: {
            name: "",
            description: "",
            optInExistingSubscribers: true,
        },
        onSave: async () => {
            const response = await addNewsletter({
                name: formState.name,
                description: formState.description,
                opt_in_existing: formState.optInExistingSubscribers,
                feedback_enabled: true,
            });

            navigate(`/settings/newsletters/${response.newsletters[0].id}`);
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = "A name is required for your newsletter";
            }

            return newErrors;
        },
    });

    // The newsletters host limit: show the limit modal and bounce back. The
    // limiter re-materializes once its lazy service/config load settles, so
    // the check re-runs until it is authoritative (the legacy timing).
    useEffect(() => {
        let cancelled = false;
        limiter.errorIfWouldGoOverLimit("newsletters").catch((error) => {
            if (cancelled) {
                return;
            }
            if (error instanceof HostLimitError) {
                showLimit({
                    prompt: error.message || "Your current plan doesn't support more newsletters.",
                    onOk: () => navigate("/pro", { crossApp: true }),
                });
                navigate(returnRoute, { replace: true });
                return;
            }
            throw error;
        });
        return () => {
            cancelled = true;
        };
    }, [limiter, navigate, returnRoute, showLimit]);

    const subscriberCount = members?.meta?.pagination.total;

    return (
        <Dialog open onOpenChange={(open) => !open && navigate(returnRoute)}>
            <DialogContent className="max-w-[540px]" data-testid="add-newsletter-modal">
                <DialogHeader>
                    <DialogTitle>Create newsletter</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6">
                    <TextField
                        error={Boolean(errors.name)}
                        hint={errors.name}
                        maxLength={191}
                        placeholder="Weekly roundup"
                        title="Name"
                        value={formState.name}
                        onChange={(e) => updateForm((state) => ({ ...state, name: e.target.value }))}
                        onKeyDown={() => clearError("name")}
                    />
                    <Field>
                        <FieldLabel htmlFor="newsletter-description">Description</FieldLabel>
                        <Textarea className="border-transparent bg-muted" id="newsletter-description" maxLength={2000} value={formState.description} onChange={(e) => updateForm((state) => ({ ...state, description: e.target.value }))} />
                    </Field>
                    <Field orientation="horizontal">
                        <FieldContent>
                            <FieldLabel htmlFor="opt-in-existing-subscribers">Opt-in existing subscribers</FieldLabel>
                            <FieldDescription>
                                {formState.optInExistingSubscribers
                                    ? `This newsletter will be available to all members. Your ${subscriberCount === undefined ? "" : formatNumber(subscriberCount)} existing subscriber${subscriberCount === 1 ? "" : "s"} will also be opted-in to receive it.`
                                    : "The newsletter will be available to all new members. Existing members won’t be subscribed, but may visit their account area to opt-in to future emails."}
                            </FieldDescription>
                        </FieldContent>
                        <Switch checked={formState.optInExistingSubscribers} id="opt-in-existing-subscribers" onCheckedChange={(checked) => updateForm((state) => ({ ...state, optInExistingSubscribers: checked }))} />
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => navigate(returnRoute)}>Cancel</Button>
                    <Button disabled={saveState === "saving"} onClick={() => void handleSave()}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
