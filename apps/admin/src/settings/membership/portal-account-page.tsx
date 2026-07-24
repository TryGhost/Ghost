import { type FocusEventHandler, useEffect, useState } from "react";
import validator from "validator";
import { Field, FieldContent, FieldDescription, FieldLabel, Separator, Switch } from "@tryghost/shade/components";
import { type Setting, type SettingValue, getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { fullEmailAddress, getEmailDomain, useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";

import { TextField } from "@/settings/app/shared/text-field";

/**
 * The Account page tab of the portal dialog, ported from the legacy
 * portal/account-page.tsx + transistor-settings.tsx: support email address
 * with validation and the Transistor integration section.
 */

function TransistorSettings({ localSettings, updateSetting }: {
    localSettings: Setting[];
    updateSetting: (key: string, setting: SettingValue) => void;
}) {
    const [
        transistorIntegrationEnabled,
        transistorPortalEnabled,
        transistorPortalHeading,
        transistorPortalDescription,
        transistorPortalButtonText,
        transistorPortalUrlTemplate,
    ] = getSettingValues<string | boolean>(localSettings, [
        "transistor",
        "transistor_portal_enabled",
        "transistor_portal_heading",
        "transistor_portal_description",
        "transistor_portal_button_text",
        "transistor_portal_url_template",
    ]);

    // Don't show the section if the main Transistor integration is disabled
    if (transistorIntegrationEnabled !== true) {
        return null;
    }

    const enabled = transistorPortalEnabled === true;

    return (
        <>
            <Separator />
            <h5 className="text-base font-semibold">Transistor</h5>
            <Field orientation="horizontal">
                <FieldContent>
                    <FieldLabel htmlFor="transistor-portal-enabled">Enable Transistor integration</FieldLabel>
                    <FieldDescription>Show a section on the account page for members to access private podcasts</FieldDescription>
                </FieldContent>
                <Switch checked={enabled} id="transistor-portal-enabled" onCheckedChange={(checked) => updateSetting("transistor_portal_enabled", checked)} />
            </Field>
            {enabled && (
                <>
                    <TextField
                        hint="The heading displayed above the Transistor section"
                        placeholder="Podcasts"
                        title="Heading"
                        value={transistorPortalHeading as string}
                        onChange={(e) => updateSetting("transistor_portal_heading", e.target.value)}
                    />
                    <TextField
                        hint="A short description of what members can do"
                        placeholder="Access your RSS feeds"
                        title="Description"
                        value={transistorPortalDescription as string}
                        onChange={(e) => updateSetting("transistor_portal_description", e.target.value)}
                    />
                    <TextField
                        hint="The text displayed on the button"
                        placeholder="Manage"
                        title="Button text"
                        value={transistorPortalButtonText as string}
                        onChange={(e) => updateSetting("transistor_portal_button_text", e.target.value)}
                    />
                    <TextField
                        hint="Use {memberUuid} as a placeholder for the member ID"
                        placeholder="https://partner.transistor.fm/ghost/{memberUuid}"
                        title="URL template"
                        value={transistorPortalUrlTemplate as string}
                        onChange={(e) => updateSetting("transistor_portal_url_template", e.target.value)}
                    />
                </>
            )}
        </>
    );
}

export function PortalAccountPage({ localSettings, updateSetting, errors, setError }: {
    localSettings: Setting[];
    updateSetting: (key: string, setting: SettingValue) => void;
    errors: Record<string, string | undefined>;
    setError: (key: string, error: string | undefined) => void;
}) {
    const { data: settingsData } = useBrowseSettings();
    const { data: siteResponse } = useBrowseSite();
    const { data: configData } = useBrowseConfig();
    const settings = settingsData?.settings ?? [];
    const siteData = siteResponse?.site;
    const config = configData!.config;
    const [membersSupportAddress, supportEmailAddress] = getSettingValues(settings, ["members_support_address", "support_email_address"]);
    const calculatedSupportAddress = supportEmailAddress?.toString() || fullEmailAddress(membersSupportAddress?.toString() || "", siteData!, config);
    const emailDomain = getEmailDomain(siteData!, config);
    const [value, setValue] = useState(calculatedSupportAddress);

    const updateSupportAddress: FocusEventHandler<HTMLInputElement> = (e) => {
        const supportAddress = e.target.value;

        if (!supportAddress) {
            setError("members_support_address", "Enter an email address");
        } else if (!validator.isEmail(supportAddress)) {
            setError("members_support_address", "Enter a valid email address");
        } else {
            setError("members_support_address", "");
        }

        const settingValue = emailDomain && supportAddress === `noreply@${emailDomain}` ? "noreply" : supportAddress;

        updateSetting("members_support_address", settingValue);
        setValue(fullEmailAddress(settingValue, siteData!, config));
    };

    useEffect(() => {
        setValue(calculatedSupportAddress);
    }, [calculatedSupportAddress]);

    return (
        <div className="mt-7 flex flex-col gap-6">
            <TextField
                error={!!errors.members_support_address}
                hint={errors.members_support_address}
                title="Support email address"
                value={value}
                onBlur={updateSupportAddress}
                onChange={(e) => setValue(e.target.value)}
            />

            <TransistorSettings
                localSettings={localSettings}
                updateSetting={updateSetting}
            />
        </div>
    );
}
