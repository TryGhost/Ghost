import { useState } from "react";
import { Button, NoValueLabel, NoValueLabelIcon, Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade/components";
import { LucideIcon, cn, formatNumber } from "@tryghost/shade/utils";
import { type Tier, getActiveTiers, getArchivedTiers, useBrowseTiers } from "@tryghost/admin-x-framework/api/tiers";
import { checkStripeEnabled, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useNavigate } from "@tryghost/admin-x-framework";
import { currencyToDecimal, getSymbol } from "@tryghost/admin-x-settings/src/utils/currency";

import { StripeButton, StripeConnectedButton } from "./stripe-buttons";
import { TrialDaysLabel } from "./tier-detail-preview";
import { SettingGroup } from "@/settings/app/shared/setting-group";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { HostLimitError, useLimiter } from "@/settings/app/shared/use-limiter";

/**
 * The Tiers group, ported from the legacy membership/tiers.tsx +
 * tiers-list.tsx: active/archived card grids with the add-tier card, and the
 * Stripe connect entry (limit-checked) in the group header.
 */

const cardContainerClasses = cn(
    "group/tiercard flex cursor-pointer flex-col items-start justify-between gap-4 self-stretch rounded-sm border border-transparent bg-muted p-4 transition-all hover:border-border hover:bg-muted/60 hover:shadow-sm min-[900px]:min-h-[200px]",
);

function TierCard({ tier }: { tier: Tier }) {
    const navigate = useNavigate();
    const currency = tier?.currency || "USD";
    const currencySymbol = currency ? getSymbol(currency) : "$";

    return (
        <div className={cardContainerClasses} data-testid="tier-card" data-tier={tier.slug}>
            <div className="w-full grow" onClick={() => navigate(`/settings/tiers/${tier.id}`)}>
                <div className="text-[1.65rem] leading-tight font-bold tracking-tight text-foreground">{tier.name}</div>
                <div className="mt-2 flex items-baseline">
                    <span className="ml-1 translate-y-[-3px] text-md font-bold uppercase">{currencySymbol}</span>
                    <span className="text-xl font-bold tracking-tighter">{formatNumber(currencyToDecimal(tier.monthly_price || 0), { maximumFractionDigits: 2 })}</span>
                    {(tier.monthly_price && tier.monthly_price > 0) ? <span className="text-muted-foreground">/month</span> : ""}
                </div>
                {tier.trial_days ? (
                    <div className="mt-1 mb-4">
                        <TrialDaysLabel size="sm" trialDays={tier.trial_days} />
                    </div>
                ) : ""}
                <div className="mt-2 line-clamp-2 text-[1.4rem] font-medium">
                    {tier.description || <span className="opacity-30">No description</span>}
                </div>
            </div>
        </div>
    );
}

function TiersList({ tab, tiers }: { tab?: "active-tiers" | "archive-tiers" | "free-tier"; tiers: Tier[] }) {
    const navigate = useNavigate();

    if (!tiers.length) {
        return (
            <NoValueLabel>
                <NoValueLabelIcon><LucideIcon.BadgeDollarSign /></NoValueLabelIcon>
                No {tab === "active-tiers" ? "active" : "archived"} tiers found.
            </NoValueLabel>
        );
    }

    return (
        <div className="mt-4 grid grid-cols-1 gap-4 min-[900px]:grid-cols-3">
            {tiers.map((tier) => <TierCard key={tier.id} tier={tier} />)}
            {tab === "active-tiers" && (
                <button className={cn(cardContainerClasses, "group cursor-pointer")} type="button" onClick={() => navigate("/settings/tiers/add")}>
                    <div className="flex size-full flex-col items-center justify-center">
                        <div className="flex flex-col items-center justify-center">
                            <div className="translate-y-[15px] transition-all group-hover:translate-y-0"><LucideIcon.Plus className="size-5 text-state-success" /></div>
                            <div className="mt-2 translate-y-[-10px] font-semibold text-state-success opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">Add tier</div>
                        </div>
                    </div>
                </button>
            )}
        </div>
    );
}

export function TiersGroup({ keywords }: { keywords: string[] }) {
    const [selectedTab, setSelectedTab] = useState("active-tiers");
    const navigate = useNavigate();
    const { showLimit } = useConfirmation();
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const settings = settingsData?.settings ?? [];
    const config = configData?.config;
    const { data: { tiers, meta, isEnd } = {}, fetchNextPage } = useBrowseTiers();
    const activeTiers = getActiveTiers(tiers || []);
    const archivedTiers = getArchivedTiers(tiers || []);
    const limiter = useLimiter();

    const hasStripeEnabled = config ? checkStripeEnabled(settings, config) : false;

    const openConnectModal = async () => {
        // Allow Stripe despite the limit when it's already connected, so it's
        // possible to disconnect or update the settings.
        if (limiter.isDisabled("limitStripeConnect") && !hasStripeEnabled) {
            try {
                await limiter.errorIfWouldGoOverLimit("limitStripeConnect");
            } catch (error) {
                if (error instanceof HostLimitError) {
                    showLimit({
                        prompt: error.message || "Your current plan doesn't support Stripe Connect.",
                        onOk: () => navigate("/pro", { crossApp: true }),
                    });
                    return;
                }
            }
        }
        navigate("/settings/stripe-connect");
    };

    const sortTiers = (t: Tier[]) => {
        return [...t].sort((a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0));
    };

    let content;
    if (hasStripeEnabled) {
        content = (
            <Tabs value={selectedTab} variant="underline" onValueChange={setSelectedTab}>
                <TabsList>
                    <TabsTrigger value="active-tiers">Active</TabsTrigger>
                    <TabsTrigger value="archived-tiers">Archived</TabsTrigger>
                </TabsList>
                <TabsContent value="active-tiers"><TiersList tab="active-tiers" tiers={sortTiers(activeTiers)} /></TabsContent>
                <TabsContent value="archived-tiers"><TiersList tab="archive-tiers" tiers={sortTiers(archivedTiers)} /></TabsContent>
            </Tabs>
        );
    } else {
        content = <TiersList tab="free-tier" tiers={activeTiers.filter((tier) => tier.type === "free")} />;
    }

    return (
        <SettingGroup
            customButtons={hasStripeEnabled
                ? <StripeConnectedButton className="hidden md:flex" onClick={() => void openConnectModal()} />
                : <StripeButton className="hidden md:inline-block" onClick={() => void openConnectModal()} />}
            description="Set prices and paid member sign up settings"
            keywords={keywords}
            navid="tiers"
            testId="tiers"
            title="Tiers"
        >
            <div className="w-full md:hidden">
                {hasStripeEnabled
                    ? <StripeConnectedButton className="w-full" onClick={() => void openConnectModal()} />
                    : <StripeButton onClick={() => void openConnectModal()} />}
            </div>

            {content}
            {isEnd === false && (
                <Button className="self-start px-0 text-primary hover:bg-transparent hover:underline" variant="ghost" onClick={() => void fetchNextPage()}>
                    {`Load more (showing ${tiers?.length || 0}/${meta?.pagination.total || 0} tiers)`}
                </Button>
            )}
        </SettingGroup>
    );
}
