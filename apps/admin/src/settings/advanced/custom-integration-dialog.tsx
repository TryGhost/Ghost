import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@tryghost/shade/components";
import { APIError } from "@tryghost/admin-x-framework/errors";
import { type APIKey, useRefreshAPIKey } from "@tryghost/admin-x-framework/api/api-keys";
import { type Integration, useBrowseIntegrations, useEditIntegration } from "@tryghost/admin-x-framework/api/integrations";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { getImageUrl, useUploadImage } from "@tryghost/admin-x-framework/api/images";
import { useForm } from "@tryghost/admin-x-framework/hooks";
import { useNavigate, useParams } from "@tryghost/admin-x-framework";

import { APIKeys } from "./api-key-field";
import { WebhooksTable } from "./webhooks-table";
import { ImageUpload } from "@/settings/app/shared/image-upload";
import { TextField } from "@/settings/app/shared/text-field";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The custom integration dialog (`/settings/integrations/:integrationId`),
 * ported from the legacy custom-integration-modal.tsx: icon/title/description
 * form, both API keys with regenerate, and the nested webhooks table.
 */
function CustomIntegrationDialogContent({ integration }: { integration: Integration }) {
    const navigate = useNavigate();
    const { confirm } = useConfirmation();

    const { mutateAsync: editIntegration } = useEditIntegration();
    const { mutateAsync: refreshAPIKey } = useRefreshAPIKey();
    const { mutateAsync: uploadImage } = useUploadImage();
    const handleError = useSettingsHandleError();

    const { formState, updateForm, handleSave, saveState, errors, clearError, okProps } = useForm({
        initialState: integration,
        savingDelay: 500,
        savedDelay: 500,
        onSave: async () => {
            await editIntegration(formState);
        },
        onSavedStateReset: () => {
            navigate("/settings/integrations");
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = "Enter integration title";
            }

            return newErrors;
        },
    });

    const adminApiKey = integration.api_keys?.find((key) => key.type === "admin");
    const contentApiKey = integration.api_keys?.find((key) => key.type === "content");

    const [adminKeyRegenerated, setAdminKeyRegenerated] = useState(false);
    const [contentKeyRegenerated, setContentKeyRegenerated] = useState(false);

    useEffect(() => {
        if (integration.type !== "custom") {
            navigate("/settings/integrations", { replace: true });
        }
    }, [integration.type, navigate]);

    const handleRegenerate = (apiKey: APIKey, setRegenerated: (value: boolean) => void) => {
        setRegenerated(false);

        const name = apiKey.type === "content" ? "Content" : "Admin";

        confirm({
            title: `Regenerate ${name} API Key`,
            prompt: `You can regenerate ${name} API Key any time, but any scripts or applications using it will need to be updated.`,
            okLabel: `Regenerate ${name} API Key`,
            onOk: async () => {
                try {
                    await refreshAPIKey({ integrationId: integration.id, apiKeyId: apiKey.id });
                    setRegenerated(true);
                } catch (e) {
                    handleError(e);
                    throw e;
                }
            },
        });
    };

    const requestClose = () => {
        confirmIfDirty(confirm, saveState === "unsaved", () => navigate("/settings/integrations"));
    };

    return (
        <Dialog open onOpenChange={(open) => !open && requestClose()}>
            <DialogContent className="flex max-h-[85vh] max-w-[720px] flex-col gap-0 overflow-hidden p-0" data-testid="custom-integration-modal">
                <div className="border-b border-border px-8 py-5">
                    <DialogTitle className="text-lg">{formState.name || "Custom integration"}</DialogTitle>
                </div>
                <div className="flex-1 overflow-y-auto px-8 py-7">
                    <div className="flex w-full flex-col gap-7 md:flex-row">
                        <div>
                            <ImageUpload
                                containerClassName="h-[100px] w-[100px]"
                                fileUploadClassName="h-[100px] w-[100px] cursor-pointer text-center text-sm"
                                id="custom-integration-icon"
                                imageClassName="h-[100px] w-[100px] object-cover"
                                imageURL={formState.icon_image || undefined}
                                onDelete={() => updateForm((state) => ({ ...state, icon_image: null }))}
                                onUpload={async (file) => {
                                    try {
                                        const imageUrl = getImageUrl(await uploadImage({ file }));
                                        updateForm((state) => ({ ...state, icon_image: imageUrl }));
                                    } catch (e) {
                                        const error = e as APIError;
                                        if (error.response!.status === 415) {
                                            error.message = "Unsupported file type";
                                        }
                                        handleError(error);
                                    }
                                }}
                            >
                                Upload icon
                            </ImageUpload>
                        </div>
                        <div className="flex grow flex-col gap-6">
                            <TextField
                                error={Boolean(errors.name)}
                                hint={errors.name}
                                maxLength={191}
                                title="Title"
                                value={formState.name}
                                onChange={(e) => updateForm((state) => ({ ...state, name: e.target.value }))}
                                onKeyDown={() => clearError("name")}
                            />
                            <TextField maxLength={2000} title="Description" value={formState.description || ""} onChange={(e) => updateForm((state) => ({ ...state, description: e.target.value }))} />
                            <APIKeys keys={[
                                {
                                    id: "content-api-key",
                                    label: "Content API key",
                                    text: contentApiKey?.secret,
                                    hint: contentKeyRegenerated ? <div className="text-sm text-state-success">Content API Key was successfully regenerated</div> : undefined,
                                    onRegenerate: () => contentApiKey && handleRegenerate(contentApiKey, setContentKeyRegenerated),
                                },
                                {
                                    id: "admin-api-key",
                                    label: "Admin API key",
                                    text: adminApiKey?.secret,
                                    hint: adminKeyRegenerated ? <div className="text-sm text-state-success">Admin API Key was successfully regenerated</div> : undefined,
                                    onRegenerate: () => adminApiKey && handleRegenerate(adminApiKey, setAdminKeyRegenerated),
                                },
                                {
                                    id: "api-url",
                                    label: "API URL",
                                    text: window.location.origin + getGhostPaths().subdir,
                                },
                            ]} />
                        </div>
                    </div>

                    <div className="mt-7">
                        <WebhooksTable integration={integration} />
                    </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-8 py-4">
                    <Button disabled={okProps.disabled} variant="outline" onClick={requestClose}>Close</Button>
                    <Button disabled={okProps.disabled} onClick={() => void handleSave({ fakeWhenUnchanged: true })}>
                        {okProps.label || "Save"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function CustomIntegrationDialog() {
    const { integrationId } = useParams();
    const { data: { integrations } = {} } = useBrowseIntegrations();
    const integration = integrations?.find(({ id }) => id === integrationId);

    if (integration) {
        return <CustomIntegrationDialogContent integration={integration} />;
    }
    return null;
}
