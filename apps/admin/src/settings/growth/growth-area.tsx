import { checkStripeEnabled, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

import { EmbedSignupGroup } from "./embed-signup-group";
import { ExploreGroup } from "./explore-group";
import { NetworkGroup } from "./network-group";
import { OffersGroup } from "./offers-group";
import { RecommendationsGroup } from "./recommendations-group";
import { growthKeywords } from "@/settings/app/nav";

/**
 * The Growth settings area, rebuilt natively: the same groups in the same
 * order as the legacy growth-settings.tsx (tips & donations renders in the
 * Membership area, exactly like the legacy membership composition). Waits for
 * the settings/config responses so every group starts from real settings.
 */
export function GrowthArea() {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();

    if (!settingsData || !configData) {
        return null;
    }

    const hasStripeEnabled = checkStripeEnabled(settingsData.settings, configData.config);

    return (
        <div className="flex flex-col gap-9">
            <NetworkGroup keywords={growthKeywords.network} />
            <ExploreGroup keywords={growthKeywords.explore} />
            <RecommendationsGroup keywords={growthKeywords.recommendations} />
            <EmbedSignupGroup keywords={growthKeywords.embedSignupForm} />
            {hasStripeEnabled && <OffersGroup keywords={growthKeywords.offers} />}
        </div>
    );
}
