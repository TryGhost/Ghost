import { useState } from "react";
import { Field, FieldDescription, FieldError, FieldLabel, Textarea } from "@tryghost/shade/components";
import { getSettingValues } from "@tryghost/admin-x-framework/api/settings";

import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

/**
 * The Spam filters group, ported from the legacy advanced/spam-filters.tsx —
 * it renders in the Membership area (navid `spam-filters` is part of the
 * Access nav item), exactly like the legacy membership-settings.tsx does.
 */
export function SpamFiltersGroup({ keywords }: { keywords: string[] }) {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        errors,
        clearError,
        handleEditingChange,
    } = useSettingGroup();

    const [initialBlockedEmailDomainsJSON] = getSettingValues(localSettings, ["blocked_email_domains"]) as string[];
    const initialBlockedEmailDomains = JSON.parse(initialBlockedEmailDomainsJSON || "[]") as string[];
    const [blockedEmailDomains, setBlockedEmailDomains] = useState(initialBlockedEmailDomains.join("\n"));

    const updateBlockedEmailDomainsSetting = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const input = e.target.value;
        setBlockedEmailDomains(input);

        const validEmailDomains = input
            .split(/[\s,]+/) // Split by space, comma, or newline
            .map((domain) => domain.trim().toLowerCase().split("@").pop()) // Normalise and keep only the email domain, e.g. 'hello@spam.xyz' -> 'spam.xyz'
            .filter((domain) => domain && domain.includes(".")); // Filter out domains without a dot

        updateSetting("blocked_email_domains", JSON.stringify(validEmailDomains));

        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const hint = (
        <>
            Prevent unwanted signups by blocking email domains. Add one domain per line, e.g., <code>spam.xyz</code> to block signups from email addresses like <code>hello@spam.xyz</code>.
        </>
    );

    return (
        <SettingGroup
            description="Protect your member signups from spam"
            isEditing={isEditing}
            keywords={keywords}
            navid="spam-filters"
            saveState={saveState}
            testId="spam-filters"
            title="Spam filters"
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                <Field data-invalid={Boolean(errors.blockedEmailDomains) || undefined}>
                    <FieldLabel htmlFor="blocked-email-domains">Blocked email domains</FieldLabel>
                    <Textarea
                        aria-invalid={Boolean(errors.blockedEmailDomains) || undefined}
                        className="h-[86px] resize-y border-transparent bg-muted"
                        id="blocked-email-domains"
                        placeholder={`spam.xyz\njunk.com`}
                        value={blockedEmailDomains}
                        onChange={updateBlockedEmailDomainsSetting}
                        onKeyDown={() => clearError("spam-filters")}
                    />
                    {errors.blockedEmailDomains ? <FieldError>{errors.blockedEmailDomains}</FieldError> : <FieldDescription>{hint}</FieldDescription>}
                </Field>
            </SettingGroupContent>
        </SettingGroup>
    );
}
