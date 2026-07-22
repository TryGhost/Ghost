import { useEffect, useId, useState } from "react";
import { Button, Field, FieldLabel, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tryghost/shade/components";
import { getHomepageUrl, useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { getPaidActiveTiers, useBrowseTiers } from "@tryghost/admin-x-framework/api/tiers";
import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";

/**
 * The Links tab of the portal dialog, ported from the legacy
 * portal/portal-links.tsx: copyable portal URLs / data attributes grouped by
 * area, with a tier picker for the tier-specific signup links.
 */

function PortalLink({ name, value }: { name: string; value: string }) {
    const id = useId();
    const [copied, setCopied] = useState(false);

    return (
        <div className="flex items-center gap-3 border-b border-border py-1">
            <div className="flex w-full grow flex-col py-3 lg:flex-row lg:items-center lg:gap-5">
                <label className="inline-block whitespace-nowrap lg:w-[180px] lg:min-w-[180px]" htmlFor={id}>{name}:</label>
                <Input className="grow border-transparent bg-transparent px-1 py-1 text-muted-foreground shadow-none" id={id} value={value} disabled readOnly />
            </div>
            <Button size="sm" variant="ghost" onClick={() => {
                void navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 1000);
            }}>{copied ? "Copied" : "Copy"}</Button>
        </div>
    );
}

function LinkSection({ title, actions, children, className }: { title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={className}>
            <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                {actions}
            </div>
            {children}
        </section>
    );
}

export function PortalLinks() {
    const [isDataAttributes, setIsDataAttributes] = useState(false);
    const [selectedTier, setSelectedTier] = useState("");
    const { data: siteResponse } = useBrowseSite();
    const siteData = siteResponse?.site;
    const { data: settingsData } = useBrowseSettings();
    const { data: { tiers: allTiers } = {} } = useBrowseTiers();
    const tiers = getPaidActiveTiers(allTiers || []);
    const [paidMembersEnabled] = getSettingValues(settingsData?.settings ?? [], ["paid_members_enabled"]) as [boolean];

    useEffect(() => {
        if (tiers?.length && !selectedTier) {
            setSelectedTier(tiers[0].id);
        }
    }, [tiers, selectedTier]);

    const tierOptions = tiers?.map((tier) => ({ label: tier.name, value: tier.id }));

    const homePageURL = siteData ? getHomepageUrl(siteData) : "";

    return (
        <div className="mx-auto h-full w-full max-w-[920px] overflow-y-auto bg-background px-14 pt-12 pb-16 text-foreground">
            <h1 className="mb-4 text-2xl font-bold tracking-tight">Links</h1>
            <p className="mb-16">Use these {isDataAttributes ? "data attributes" : "links"} in your theme to show pages of Portal.</p>

            <LinkSection
                actions={<Button className="text-primary" size="sm" variant="ghost" onClick={() => setIsDataAttributes(!isDataAttributes)}>{isDataAttributes ? "Links" : "Data attributes"}</Button>}
                title="Generic"
            >
                <PortalLink name="Default" value={isDataAttributes ? "data-portal" : `${homePageURL}#/portal`} />
                <PortalLink name="Sign in" value={isDataAttributes ? 'data-portal="signin"' : `${homePageURL}#/portal/signin`} />
                <PortalLink name="Sign up" value={isDataAttributes ? 'data-portal="signup"' : `${homePageURL}#/portal/signup`} />
                {paidMembersEnabled && <PortalLink name="Gift subscriptions" value={isDataAttributes ? 'data-portal="gift"' : `${homePageURL}#/portal/gift`} />}
            </LinkSection>

            <LinkSection className="mt-14" title="Tiers">
                <div className="flex w-full items-center gap-2 border-b border-border py-2">
                    <span className="inline-block w-[180px] min-w-[180px] shrink-0">Tier:</span>
                    <Field className="grow">
                        <FieldLabel className="sr-only">Tier</FieldLabel>
                        <Select value={selectedTier} onValueChange={setSelectedTier}>
                            <SelectTrigger aria-label="Tier"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {tierOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <PortalLink name="Signup / Monthly" value={isDataAttributes ? `data-portal="signup/${selectedTier}/monthly"` : `${homePageURL}#/portal/signup/${selectedTier}/monthly`} />
                <PortalLink name="Signup / Yearly" value={isDataAttributes ? `data-portal="signup/${selectedTier}/yearly"` : `${homePageURL}#/portal/signup/${selectedTier}/yearly`} />
                <PortalLink name="Signup / Free" value={isDataAttributes ? 'data-portal="signup/free"' : `${homePageURL}#/portal/signup/free`} />
            </LinkSection>

            <LinkSection className="mt-14" title="Account">
                <PortalLink name="Account" value={isDataAttributes ? 'data-portal="account"' : `${homePageURL}#/portal/account`} />
                <PortalLink name="Account / Plans" value={isDataAttributes ? 'data-portal="account/plans"' : `${homePageURL}#/portal/account/plans`} />
                <PortalLink name="Account / Profile" value={isDataAttributes ? 'data-portal="account/profile"' : `${homePageURL}#/portal/account/profile`} />
                <PortalLink name="Account / Newsletters" value={isDataAttributes ? 'data-portal="account/newsletters"' : `${homePageURL}#/portal/account/newsletters`} />
                <PortalLink name="Account / Newsletter help" value={isDataAttributes ? 'data-portal="account/newsletters/help"' : `${homePageURL}#/portal/account/newsletters/help`} />
            </LinkSection>
        </div>
    );
}
