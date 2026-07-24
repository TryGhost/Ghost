import { Field, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { getSettingValues, useEditSettings } from "@tryghost/admin-x-framework/api/settings";

import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { TextField } from "@/settings/app/shared/text-field";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Mailgun group, ported from the legacy email/mailgun.tsx: region select
 * plus domain/API-key fields, including the save-default-region-first quirk
 * when the region was never set.
 */

const MAILGUN_REGIONS = [
    { label: "🇺🇸 US", value: "https://api.mailgun.net/v3" },
    { label: "🇪🇺 EU", value: "https://api.eu.mailgun.net/v3" },
];

export function MailgunGroup({ keywords }: { keywords: string[] }) {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange,
    } = useSettingGroup();
    const { mutateAsync: editSettings } = useEditSettings();
    const handleError = useSettingsHandleError();

    const [mailgunRegion, mailgunDomain, mailgunApiKey] = getSettingValues(localSettings, [
        "mailgun_base_url", "mailgun_domain", "mailgun_api_key",
    ]) as string[];

    const isMailgunSetup = mailgunDomain && mailgunApiKey;

    const values = (
        <SettingGroupContent
            columns={1}
            values={[
                isMailgunSetup ? {
                    key: "status",
                    value: (
                        <div className="flex items-center gap-2">
                            <LucideIcon.CircleCheck className="size-4 text-state-success" />
                            <span>Mailgun is set up</span>
                        </div>
                    ),
                } : {
                    heading: "Status",
                    key: "status",
                    value: "Mailgun is not set up",
                },
            ]}
        />
    );

    const apiKeysHint = (
        <>Find your Mailgun API keys <a className="text-primary" href="https://app.mailgun.com/settings/api_security" rel="noopener noreferrer" target="_blank">here</a></>
    );
    const inputs = (
        <SettingGroupContent>
            <div className="grid grid-cols-[120px_auto] gap-x-3 gap-y-6">
                <Field>
                    <FieldLabel>Mailgun region</FieldLabel>
                    <Select value={mailgunRegion ?? ""} onValueChange={(value) => updateSetting("mailgun_base_url", value)}>
                        <SelectTrigger aria-label="Mailgun region"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {MAILGUN_REGIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </Field>
                <TextField
                    title="Mailgun domain"
                    value={mailgunDomain ?? ""}
                    onChange={(e) => updateSetting("mailgun_domain", e.target.value)}
                />
                <div className="col-span-2">
                    <TextField
                        hint={apiKeysHint}
                        title="Mailgun private API key"
                        type="password"
                        value={mailgunApiKey ?? ""}
                        onChange={(e) => updateSetting("mailgun_api_key", e.target.value)}
                    />
                </div>
            </div>
        </SettingGroupContent>
    );

    const groupDescription = (
        <>The Mailgun API is used for bulk email newsletter delivery. <a className="text-primary" href="https://ghost.org/docs/faq/mailgun-newsletters/" rel="noopener noreferrer" target="_blank">Why is this required?</a></>
    );

    return (
        <SettingGroup
            description={groupDescription}
            isEditing={isEditing}
            keywords={keywords}
            navid="mailgun"
            saveState={saveState}
            testId="mailgun"
            title="Mailgun"
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={async () => {
                // When the region was never chosen, updateSetting never ran for
                // it, so mailgun_base_url would stay null — persist the default
                // region first (the legacy special case).
                if (!mailgunRegion) {
                    try {
                        await editSettings([{ key: "mailgun_base_url", value: MAILGUN_REGIONS[0].value }]);
                    } catch (e) {
                        handleError(e);
                        return;
                    }
                }
                await handleSave();
            }}
        >
            {isEditing ? inputs : values}
        </SettingGroup>
    );
}
