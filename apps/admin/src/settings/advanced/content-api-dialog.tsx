import { LucideIcon } from "@tryghost/shade/utils";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { useBrowseIntegrations } from "@tryghost/admin-x-framework/api/integrations";
import { useNavigate } from "@tryghost/admin-x-framework";

import { APIKeys } from "./api-key-field";
import { IntegrationDialog } from "./integration-dialog";
import { IntegrationIcon } from "./integration-icon";

/** The Content API dialog (`/settings/integrations/contentapi`), ported from the legacy content-api-modal.tsx. */
export function ContentApiDialog() {
    const navigate = useNavigate();
    const { data: { integrations } = { integrations: [] } } = useBrowseIntegrations();

    const integration = integrations.find(({ slug }) => slug === "ghost-core-content");
    const contentApiKey = integration?.api_keys?.find((key) => key.type === "content");

    return (
        <IntegrationDialog
            cancelLabel=""
            detail="Access your content programmatically"
            footerLeft={(
                <a className="inline-flex items-center gap-1 text-sm font-medium" href="https://ghost.org/docs/content-api/" rel="noopener noreferrer" target="_blank">
                    Open docs <LucideIcon.ArrowUpRight className="size-3.5" />
                </a>
            )}
            icon={<IntegrationIcon name="angle-brackets" size={56} />}
            okLabel="Close"
            testId="content-api-modal"
            title="Content API"
            onOk={() => navigate("/settings/integrations")}
        >
            <p className="mb-6 text-sm text-muted-foreground">This key provides read-only access to your published content. For full read/write access, create a custom integration.</p>
            <APIKeys keys={[
                {
                    id: "content-api-key",
                    label: "Content API key",
                    text: contentApiKey?.secret,
                },
                { id: "api-url", label: "API URL", text: window.location.origin + getGhostPaths().subdir },
            ]} />
        </IntegrationDialog>
    );
}
