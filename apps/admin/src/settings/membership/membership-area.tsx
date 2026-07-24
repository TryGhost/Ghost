import { checkStripeEnabled, getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

import { AccessGroup } from "./access-group";
import { CustomFieldsGroup } from "./custom-fields-group";
import { GiftSubscriptionsGroup } from "./gift-subscriptions-group";
import { MemberEmailsGroup } from "./member-emails-group";
import { PortalGroup } from "./portal-group";
import { SpamFiltersGroup } from "./spam-filters-group";
import { TiersGroup } from "./tiers-group";
import { TipsAndDonationsGroup } from "./tips-and-donations-group";
import { membershipKeywords } from "@/settings/app/nav";
import { useFeatureFlag } from "@/hooks/use-feature-flag";

/**
 * The Membership settings area, rebuilt natively: the same groups in the same
 * order as the legacy membership-settings.tsx (spam filters and tips &
 * donations render here too, exactly like the legacy file composes them).
 * Waits for the settings/config responses so every group's form state starts
 * from real settings.
 */
export function MembershipArea() {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const hasAutomations = useFeatureFlag("automations");
    const hasCustomFields = useFeatureFlag("membersCustomFields");

    if (!settingsData || !configData) {
        return null;
    }

    const settings = settingsData.settings;
    const [hasTipsAndDonations, paidMembersEnabled] = getSettingValues(settings, ["donations_enabled", "paid_members_enabled"]) as [boolean, boolean];
    const hasStripeEnabled = checkStripeEnabled(settings, configData.config);

    return (
        <div className="flex flex-col gap-9">
            <AccessGroup keywords={membershipKeywords.access} />
            <SpamFiltersGroup keywords={membershipKeywords.access} />
            <TiersGroup keywords={membershipKeywords.tiers} />
            <PortalGroup keywords={membershipKeywords.portal} />
            {paidMembersEnabled && <GiftSubscriptionsGroup keywords={membershipKeywords.giftSubscriptions} />}
            {!hasAutomations && <MemberEmailsGroup keywords={membershipKeywords.memberEmails} />}
            {hasTipsAndDonations && hasStripeEnabled && <TipsAndDonationsGroup keywords={membershipKeywords.tips} />}
            {hasCustomFields && <CustomFieldsGroup keywords={membershipKeywords.customFields} />}
        </div>
    );
}
