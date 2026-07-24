import { useEffect, useState } from "react";
import { Field, FieldContent, FieldDescription, FieldLabel, Switch } from "@tryghost/shade/components";
import { type Setting, getSettingValues, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseIntegrations } from "@tryghost/admin-x-framework/api/integrations";
import { useNavigate } from "@tryghost/admin-x-framework";
import { useRefreshAPIKey } from "@tryghost/admin-x-framework/api/api-keys";

import transistorBookmarkImage from "./assets/ghost-transistor.png";
import { APIKeys } from "./api-key-field";
import { IntegrationDialog } from "./integration-dialog";
import { IntegrationIcon } from "./integration-icon";
import { useSaveLabel } from "./use-save-label";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/** The Transistor configuration dialog (`/settings/integrations/transistor`), ported from the legacy transistor-modal.tsx. */
export function TransistorDialog() {
    const navigate = useNavigate();
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const settings = settingsData?.settings ?? [];
    const { mutateAsync: editSettings } = useEditSettings();
    const { data: { integrations } = { integrations: [] } } = useBrowseIntegrations();
    const { mutateAsync: refreshAPIKey } = useRefreshAPIKey();
    const handleError = useSettingsHandleError();
    const { confirm } = useConfirmation();
    const { label: okLabel, run, colorClass } = useSaveLabel();
    const [regenerated, setRegenerated] = useState(false);

    const builtInApiIntegrationsDisabled = Boolean(configData?.config?.hostSettings?.limits?.customIntegrations?.disabled);
    const [transistorEnabled] = getSettingValues<boolean>(settings, ["transistor"]);
    const [enabled, setEnabled] = useState<boolean>(Boolean(transistorEnabled));

    useEffect(() => {
        setEnabled(transistorEnabled || false);
    }, [transistorEnabled]);

    useEffect(() => {
        if (builtInApiIntegrationsDisabled) {
            navigate("/settings/integrations", { replace: true });
        }
    }, [builtInApiIntegrationsDisabled, navigate]);

    const integration = integrations.find(({ slug }) => slug === "transistor");
    const adminApiKey = integration?.api_keys?.find((key) => key.type === "admin");

    const handleRegenerate = () => {
        if (!integration || !adminApiKey) {
            return;
        }

        setRegenerated(false);

        confirm({
            title: "Regenerate Admin API Key",
            prompt: "You will need to update the API key in your Transistor account settings after regenerating.",
            okLabel: "Regenerate Admin API Key",
            onOk: async () => {
                try {
                    await refreshAPIKey({ integrationId: integration.id, apiKeyId: adminApiKey.id });
                    setRegenerated(true);
                } catch (e) {
                    handleError(e);
                    throw e;
                }
            },
        });
    };

    const handleSave = async () => {
        const updates: Setting[] = [{ key: "transistor", value: enabled }];
        await run(() => editSettings(updates));
    };

    return (
        <IntegrationDialog
            detail="Give your members access to private podcasts"
            dirty={enabled !== Boolean(transistorEnabled)}
            icon={<IntegrationIcon name="transistor" size={56} />}
            okColorClass={colorClass}
            okLabel={okLabel}
            testId="transistor-modal"
            title="Transistor.fm"
            onOk={handleSave}
        >
            <div className="flex flex-col gap-6">
                <Field orientation="horizontal">
                    <FieldContent>
                        <FieldLabel htmlFor="transistor-enabled">Enable Transistor</FieldLabel>
                        <FieldDescription>Connect your Ghost site with <a className="text-state-success" href="https://transistor.fm" rel="noopener noreferrer" target="_blank">Transistor.fm</a> to offer members private podcasts.</FieldDescription>
                    </FieldContent>
                    <Switch checked={enabled} id="transistor-enabled" onCheckedChange={setEnabled} />
                </Field>
                {enabled && (
                    <APIKeys keys={[
                        {
                            id: "admin-api-key",
                            label: "Admin API key",
                            text: adminApiKey?.secret,
                            hint: regenerated ? <div className="text-sm text-state-success">Admin API Key was successfully regenerated</div> : undefined,
                            onRegenerate: handleRegenerate,
                        },
                        { id: "api-url", label: "API URL", text: window.location.origin + getGhostPaths().subdir },
                    ]} />
                )}
                {enabled && (
                    <div className="flex flex-col items-center">
                        <a className="flex flex-col items-stretch justify-between overflow-hidden rounded-md bg-muted transition-all hover:bg-accent md:flex-row" href="https://ghost.org/integrations/transistor/" rel="noopener noreferrer" target="_blank">
                            <div className="order-2 px-7 py-5 md:order-1">
                                <div className="font-semibold">How to use Transistor in Ghost</div>
                                <div className="mt-1 text-sm text-muted-foreground">Learn more about connecting Transistor with Ghost to offer members access to private podcasts in Portal or as an embed in posts and pages with a custom Transistor card.</div>
                            </div>
                            <div className="order-1 hidden w-[200px] shrink-0 items-center justify-center overflow-hidden md:order-2 md:flex">
                                <img alt="Bookmark Thumb" className="min-h-full min-w-full shrink-0" src={transistorBookmarkImage} />
                            </div>
                        </a>
                    </div>
                )}
            </div>
        </IntegrationDialog>
    );
}
