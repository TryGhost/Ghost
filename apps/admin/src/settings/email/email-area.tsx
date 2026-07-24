import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

import { DefaultRecipientsGroup } from "./default-recipients-group";
import { EmailsGroup } from "./emails-group";
import { EnableNewslettersGroup } from "./enable-newsletters-group";
import { MailgunGroup } from "./mailgun-group";
import { NewslettersGroup } from "./newsletters-group";
import { emailKeywords, emailsKeywords } from "@/settings/app/nav";
import { useFeatureFlag } from "@/hooks/use-feature-flag";

/**
 * The Email settings area, rebuilt natively: the same groups in the same
 * order as the legacy email-settings.tsx (automations off) / emails.tsx
 * (automations on), with the same newsletters-enabled/mailgun conditions.
 * Waits for the settings/config responses so every group's form state starts
 * from real settings.
 */
export function EmailArea() {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const hasAutomations = useFeatureFlag("automations");

    if (!settingsData || !configData) {
        return null;
    }

    const [newslettersEnabled] = getSettingValues(settingsData.settings, ["editor_default_email_recipients"]) as [string];
    const hasNewslettersEnabled = newslettersEnabled !== "disabled";
    const hasMailgun = hasNewslettersEnabled && !configData.config.mailgunIsConfigured;

    if (hasAutomations) {
        return (
            <div className="flex flex-col gap-9">
                <EnableNewslettersGroup keywords={emailsKeywords.enableNewsletters} />
                {hasNewslettersEnabled && <DefaultRecipientsGroup keywords={emailsKeywords.defaultRecipients} />}
                <EmailsGroup keywords={emailsKeywords.emails} newslettersEnabled={hasNewslettersEnabled} />
                {hasMailgun && <MailgunGroup keywords={emailsKeywords.mailgun} />}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-9">
            <EnableNewslettersGroup keywords={emailKeywords.enableNewsletters} />
            {hasNewslettersEnabled && (
                <>
                    <DefaultRecipientsGroup keywords={emailKeywords.defaultRecipients} />
                    <NewslettersGroup keywords={emailKeywords.newsletters} />
                    {hasMailgun && <MailgunGroup keywords={emailKeywords.mailgun} />}
                </>
            )}
        </div>
    );
}
