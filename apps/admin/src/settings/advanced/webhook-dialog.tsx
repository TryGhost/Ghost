import { useId } from "react";
import validator from "validator";
import webhookEventOptions from "@tryghost/admin-x-settings/src/components/settings/advanced/integrations/webhook-event-options";
import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Field,
    FieldError,
    FieldLabel,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@tryghost/shade/components";
import { type Webhook, useCreateWebhook, useEditWebhook } from "@tryghost/admin-x-framework/api/webhooks";
import { useForm } from "@tryghost/admin-x-framework/hooks";

import { TextField } from "@/settings/app/shared/text-field";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The add/edit webhook dialog, nested inside the custom integration dialog
 * (ported from the legacy webhook-modal.tsx — event options imported from
 * the legacy source, not duplicated).
 */
export interface WebhookDialogProps {
    webhook?: Webhook;
    integrationId: string;
    onClose: () => void;
}

export function WebhookDialog({ webhook, integrationId, onClose }: WebhookDialogProps) {
    const eventErrorId = useId();
    const { mutateAsync: createWebhook } = useCreateWebhook();
    const { mutateAsync: editWebhook } = useEditWebhook();
    const handleError = useSettingsHandleError();

    const { formState, updateForm, handleSave, errors, clearError } = useForm<Partial<Webhook>>({
        initialState: webhook || {},
        onSave: async () => {
            if (formState.id) {
                await editWebhook(formState as Webhook);
            } else {
                await createWebhook({ ...formState, integration_id: integrationId });
            }
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = "Enter a name";
            }

            if (!formState.event) {
                newErrors.event = "Select an event";
            }

            if (!formState.target_url) {
                newErrors.target_url = "Enter a target URL";
            }

            if (formState.target_url && !validator.isURL(formState.target_url, { require_tld: false })) {
                newErrors.target_url = "Enter a valid URL";
            }

            return newErrors;
        },
    });

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[85vh] max-w-[480px] overflow-y-auto" data-testid="webhook-modal">
                <DialogHeader>
                    <DialogTitle>Add webhook</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6">
                    <TextField
                        error={Boolean(errors.name)}
                        hint={errors.name}
                        maxLength={191}
                        placeholder="Custom webhook"
                        title="Name"
                        value={formState.name}
                        onChange={(e) => updateForm((state) => ({ ...state, name: e.target.value }))}
                        onKeyDown={() => clearError("name")}
                    />
                    <Field data-invalid={Boolean(errors.event) || undefined}>
                        <FieldLabel className="sr-only">Event</FieldLabel>
                        <Select
                            value={formState.event ?? ""}
                            onValueChange={(value) => {
                                updateForm((state) => ({ ...state, event: value }));
                                clearError("event");
                            }}
                        >
                            <SelectTrigger aria-describedby={errors.event ? eventErrorId : undefined} aria-invalid={Boolean(errors.event) || undefined} aria-label="Event" data-testid="event-select">
                                <SelectValue placeholder="Select an event" />
                            </SelectTrigger>
                            <SelectContent>
                                {webhookEventOptions.map((group) => (
                                    <SelectGroup key={group.label}>
                                        <SelectLabel>{group.label}</SelectLabel>
                                        {group.options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.event && <FieldError id={eventErrorId}>{errors.event}</FieldError>}
                    </Field>
                    <TextField
                        error={Boolean(errors.target_url)}
                        hint={errors.target_url}
                        maxLength={2000}
                        placeholder="https://example.com"
                        title="Target URL"
                        type="url"
                        value={formState.target_url}
                        onChange={(e) => updateForm((state) => ({ ...state, target_url: e.target.value }))}
                        onKeyDown={() => clearError("target_url")}
                    />
                    <TextField
                        maxLength={191}
                        placeholder="https://example.com"
                        title="Secret"
                        value={formState.secret || undefined}
                        onChange={(e) => updateForm((state) => ({ ...state, secret: e.target.value }))}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => void (async () => {
                        if (await handleSave()) {
                            onClose();
                        }
                    })()}>
                        {webhook ? "Update" : "Add"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
