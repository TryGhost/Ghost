import { Button } from "@tryghost/shade/components";
import { checkStripeEnabled, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { getPaidActiveTiers, useBrowseTiers } from "@tryghost/admin-x-framework/api/tiers";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseOffers } from "@tryghost/admin-x-framework/api/offers";
import { useNavigate } from "@tryghost/admin-x-framework";

import { SettingGroup } from "@/settings/app/shared/setting-group";

/**
 * The Offers group, ported from the legacy growth/offers.tsx: the Manage
 * offers entry into the routed offers index, plus the no-active-tier notice.
 */
export function OffersGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();

    const { data: { offers: allOffers = [] } = {} } = useBrowseOffers();
    const { data: { tiers: allTiers } = {} } = useBrowseTiers();
    const paidActiveTiers = getPaidActiveTiers(allTiers || []);

    const signupOffers = allOffers.filter((offer) => offer.redemption_type === "signup");
    const stripeEnabled = settingsData && configData ? checkStripeEnabled(settingsData.settings, configData.config) : false;

    return (
        <SettingGroup
            customButtons={(
                <Button disabled={!stripeEnabled} size="sm" variant="ghost" onClick={() => navigate("/settings/offers/edit")}>
                    Manage offers
                </Button>
            )}
            description={<>Create discounts &amp; coupons to boost new subscriptions and retain existing members. <a className="text-primary" href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            keywords={keywords}
            navid="offers"
            testId="offers"
            title="Offers"
        >
            {paidActiveTiers.length === 0 && signupOffers.length === 0 && (
                <div>
                    <span>You must have an active tier to create an offer.</span>
                    {" "}
                    <Button className="h-auto p-0 font-normal" variant="link" onClick={() => navigate("/settings/tiers")}>Manage tiers</Button>
                </div>
            )}
        </SettingGroup>
    );
}
