import { type ReactNode, useState } from "react";
import { Badge, Button, NoValueLabel, NoValueLabelIcon, Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade/components";
import { LucideIcon, cn } from "@tryghost/shade/utils";
import { type Integration, useBrowseIntegrations, useDeleteIntegration } from "@tryghost/admin-x-framework/api/integrations";
import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useNavigate } from "@tryghost/admin-x-framework";

import integrationsSettingsImage from "./assets/integrations-settings.png";
import { IntegrationIcon, type IntegrationIconName } from "./integration-icon";
import { SettingGroup } from "@/settings/app/shared/setting-group";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { usePinturaEditor } from "@/settings/app/shared/use-pintura-editor";

/**
 * The Integrations group, ported from the legacy advanced/integrations.tsx:
 * built-in/custom tabs, hover-reveal Configure actions, Active badges, the
 * host-limited sort-to-bottom + Upgrade CTA, and the add/delete custom
 * integration flows. Configuration dialogs are routed
 * (`/settings/integrations/<slug|id>`), so legacy deep links keep working.
 */

interface IntegrationItemProps {
    icon?: ReactNode;
    title: string;
    detail: ReactNode;
    action: () => void;
    onDelete?: () => void;
    active?: boolean;
    disabled?: boolean;
    testId?: string;
    custom?: boolean;
}

function IntegrationItem({ icon, title, detail, action, onDelete, active, disabled, testId, custom = false }: IntegrationItemProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (disabled) {
            navigate("pro", { crossApp: true });
        } else {
            action();
        }
    };

    const buttons = custom ? (
        <Button
            className="text-destructive"
            size="sm"
            variant="ghost"
            onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
            }}
        >
            Delete
        </Button>
    ) : disabled ? (
        <Button size="sm" variant="ghost" onClick={(e) => {
            e.stopPropagation();
            handleClick();
        }}>
            <LucideIcon.Lock className="size-3.5" /> Upgrade
        </Button>
    ) : (
        <Button className="text-state-success" size="sm" variant="ghost" onClick={(e) => {
            e.stopPropagation();
            handleClick();
        }}>
            Configure
        </Button>
    );

    return (
        <div
            className={cn(
                "group flex cursor-pointer items-center gap-3 py-3",
                disabled && "opacity-50 saturate-0",
            )}
            data-testid={testId}
            onClick={handleClick}
        >
            <div className="shrink-0">{icon}</div>
            <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                    {active ? (
                        <span className="inline-flex items-center gap-1">
                            {title} <Badge className="uppercase" variant="success">Active</Badge>
                        </span>
                    ) : title}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{detail}</div>
            </div>
            {/* Hover-reveal actions (the legacy hideActions contract); the Upgrade CTA stays visible. */}
            <div className={cn("shrink-0", !disabled && "group-hover:visible md:invisible")}>{buttons}</div>
        </div>
    );
}

interface BuiltInIntegrationItem {
    active?: boolean;
    detail: string;
    disabled?: boolean;
    icon: IntegrationIconName;
    route: string;
    testId: string;
    title: string;
}

function BuiltInIntegrations() {
    const navigate = useNavigate();
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const settings = settingsData?.settings ?? [];
    const config = configData?.config;

    const builtInApiIntegrationsDisabled = Boolean(config?.hostSettings?.limits?.customIntegrations?.disabled);

    const [unsplashEnabled, firstPromoterEnabled, slackUrl, slackUsername, transistorEnabled] = getSettingValues<boolean>(settings, [
        "unsplash",
        "firstpromoter",
        "slack_url",
        "slack_username",
        "transistor",
    ]);
    // Live like legacy: Active only once the Pintura script/css actually load.
    const pinturaActive = usePinturaEditor().isEnabled;

    const items: BuiltInIntegrationItem[] = [
        {
            detail: "Automation for your apps",
            disabled: builtInApiIntegrationsDisabled,
            icon: "zapier",
            route: "/settings/integrations/zapier",
            testId: "zapier-integration",
            title: "Zapier",
        },
        {
            active: Boolean(slackUrl && slackUsername),
            detail: "A messaging app for teams",
            icon: "slack",
            route: "/settings/integrations/slack",
            testId: "slack-integration",
            title: "Slack",
        },
        {
            active: Boolean(unsplashEnabled),
            detail: "Beautiful, free photos",
            icon: "unsplash",
            route: "/settings/integrations/unsplash",
            testId: "unsplash-integration",
            title: "Unsplash",
        },
        {
            active: Boolean(firstPromoterEnabled),
            detail: "Launch your member referral program",
            icon: "firstpromoter",
            route: "/settings/integrations/firstpromoter",
            testId: "firstpromoter-integration",
            title: "FirstPromoter",
        },
        {
            active: pinturaActive,
            detail: "Advanced image editing",
            icon: "pintura",
            route: "/settings/integrations/pintura",
            testId: "pintura-integration",
            title: "Pintura",
        },
        {
            active: Boolean(transistorEnabled),
            detail: "Give your members access to private podcasts",
            disabled: builtInApiIntegrationsDisabled,
            icon: "transistor",
            route: "/settings/integrations/transistor",
            testId: "transistor-integration",
            title: "Transistor.fm",
        },
        {
            detail: "Access your content programmatically",
            icon: "angle-brackets",
            route: "/settings/integrations/contentapi",
            testId: "content-api-integration",
            title: "Content API",
        },
    ];

    const sortedItems = [
        ...items.filter((item) => !item.disabled),
        ...items.filter((item) => item.disabled),
    ];

    return (
        <div className="flex flex-col divide-y divide-border">
            {sortedItems.map((item) => (
                <IntegrationItem
                    key={item.testId}
                    action={() => navigate(item.route)}
                    active={item.active}
                    detail={item.detail}
                    disabled={item.disabled}
                    icon={<IntegrationIcon name={item.icon} size={32} />}
                    testId={item.testId}
                    title={item.title}
                />
            ))}
        </div>
    );
}

function CustomIntegrations({ integrations }: { integrations: Integration[] }) {
    const navigate = useNavigate();
    const { mutateAsync: deleteIntegration } = useDeleteIntegration();
    const handleError = useSettingsHandleError();
    const { confirm } = useConfirmation();

    if (!integrations.length) {
        return (
            <NoValueLabel>
                <NoValueLabelIcon><LucideIcon.Plug /></NoValueLabelIcon>
                No custom integration.
            </NoValueLabel>
        );
    }

    return (
        <div className="flex flex-col divide-y divide-border">
            {integrations.map((integration) => (
                <IntegrationItem
                    key={integration.id}
                    action={() => navigate(`/settings/integrations/${integration.id}`)}
                    detail={(
                        <div className="line-clamp-2 break-words">
                            <span title={`${integration.name}: ${integration.description || "No description"}`}>{integration.description || "No description"}</span>
                        </div>
                    )}
                    icon={
                        integration.icon_image
                            ? <img className="size-8 shrink-0 object-cover" role="presentation" src={integration.icon_image} />
                            : <IntegrationIcon className="w-8" name="integration" size={32} />
                    }
                    title={integration.name}
                    custom
                    onDelete={() => {
                        confirm({
                            title: "Are you sure?",
                            prompt: "Deleting this integration will remove all webhooks and api keys associated with it.",
                            okLabel: "Delete Integration",
                            destructive: true,
                            onOk: async () => {
                                try {
                                    await deleteIntegration(integration.id);
                                    showToast({ title: "Integration deleted", type: "info" });
                                } catch (e) {
                                    handleError(e);
                                    throw e;
                                }
                            },
                        });
                    }}
                />
            ))}
        </div>
    );
}

export function IntegrationsGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState<"built-in" | "custom">("built-in");
    const { data: { integrations } = { integrations: [] } } = useBrowseIntegrations();

    const handleAddCustom = () => {
        navigate("/settings/integrations/new");
        setSelectedTab("custom");
    };

    return (
        <SettingGroup
            customButtons={(
                <Button size="sm" variant="ghost" onClick={handleAddCustom}>Add custom integration</Button>
            )}
            description="Make Ghost work with apps and tools."
            keywords={keywords}
            navid="integrations"
            testId="integrations"
            title="Integrations"
        >
            {/* The decorative banner sits above the header via flex order (the card root is a flex column). */}
            <div className="-order-1 -mx-5 -mt-5 overflow-hidden rounded-t-xl border-b border-border md:-mx-7 md:-mt-7">
                <img alt="" className="size-full" src={integrationsSettingsImage} />
            </div>
            <Tabs value={selectedTab} variant="underline" onValueChange={(value) => setSelectedTab(value as typeof selectedTab)}>
                <TabsList>
                    <TabsTrigger value="built-in">Built-in</TabsTrigger>
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>
                <TabsContent value="built-in"><BuiltInIntegrations /></TabsContent>
                <TabsContent value="custom"><CustomIntegrations integrations={integrations.filter((integration) => integration.type === "custom")} /></TabsContent>
            </Tabs>
        </SettingGroup>
    );
}
