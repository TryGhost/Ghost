import { useEffect, useState } from "react";
import { LucideIcon } from "@tryghost/shade/utils";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseIntegrations } from "@tryghost/admin-x-framework/api/integrations";
import { useNavigate } from "@tryghost/admin-x-framework";
import { useRefreshAPIKey } from "@tryghost/admin-x-framework/api/api-keys";
import { zapierTemplates } from "@tryghost/admin-x-settings/src/data/zapier-templates";

import zapierLogoUrl from "./assets/icons/zapier-logo.svg";
import { APIKeys } from "./api-key-field";
import { IntegrationDialog } from "./integration-dialog";
import { IntegrationIcon } from "./integration-icon";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Zapier dialog (`/settings/integrations/zapier`), ported from the
 * legacy zapier-modal.tsx: Admin API key + the Zap template gallery (the
 * template data is the legacy package's — imported, not duplicated).
 */
export function ZapierDialog() {
    const navigate = useNavigate();
    const { data: { integrations } = { integrations: [] } } = useBrowseIntegrations();
    const { data: configData } = useBrowseConfig();
    const { mutateAsync: refreshAPIKey } = useRefreshAPIKey();
    const handleError = useSettingsHandleError();
    const { confirm } = useConfirmation();
    const [regenerated, setRegenerated] = useState(false);

    const zapierDisabled = Boolean(configData?.config?.hostSettings?.limits?.customIntegrations?.disabled);
    const integration = integrations.find(({ slug }) => slug === "zapier");
    const adminApiKey = integration?.api_keys?.find((key) => key.type === "admin");

    useEffect(() => {
        if (zapierDisabled) {
            navigate("/settings/integrations", { replace: true });
        }
    }, [zapierDisabled, navigate]);

    const handleRegenerate = () => {
        if (!integration || !adminApiKey) {
            return;
        }

        setRegenerated(false);

        confirm({
            title: "Regenerate Admin API Key",
            prompt: 'You will need to locate the Ghost App within your Zapier account and click on "Reconnect" to enter the new Admin API Key.',
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

    return (
        <IntegrationDialog
            cancelLabel=""
            detail="Automation for your favorite apps"
            footerLeft={(
                <a
                    className="text-sm font-bold"
                    href="https://zapier.com/apps/ghost/integrations?utm_medium=partner_api&utm_source=widget&utm_campaign=Widget"
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    View more Ghost integrations powered by <img alt="Zapier" className="relative top-[-2px] inline-block" src={zapierLogoUrl} />
                </a>
            )}
            headerExtra={(
                <div className="mt-1 -mb-4">
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
                </div>
            )}
            icon={<IntegrationIcon name="zapier" size={56} />}
            okLabel="Close"
            testId="zapier-modal"
            title="Zapier"
            onOk={() => navigate("/settings/integrations")}
        >
            <div className="flex flex-col divide-y divide-border">
                {zapierTemplates.map((template) => (
                    <div key={template.url} className="flex items-center gap-3 py-2 pl-3">
                        <div className="flex min-w-0 flex-1 flex-col gap-4 md:flex-row md:items-center">
                            <div className="flex shrink-0 flex-nowrap items-center gap-2">
                                <img className="size-8 object-contain" role="presentation" src={template.ghostImage} />
                                <LucideIcon.ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                                <img className="size-8 object-contain" role="presentation" src={template.appImage} />
                            </div>
                            <span className="text-sm">{template.title}</span>
                        </div>
                        <a className="shrink-0 text-sm font-semibold whitespace-nowrap text-[#FF4A00]" href={template.url} rel="noopener noreferrer" target="_blank">Use this Zap</a>
                    </div>
                ))}
            </div>
        </IntegrationDialog>
    );
}
