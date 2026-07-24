import { Banner, Switch } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { type Setting, getSettingValues, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";
import { useNavigate } from "@tryghost/admin-x-framework";

import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Newsletter sending group, ported from the legacy
 * email/enable-newsletters.tsx: an immediate-save toggle (no edit mode) with
 * the disabled-by-subscription-access banner.
 */
export function EnableNewslettersGroup({ keywords }: { keywords: string[] }) {
    const { data: settingsData } = useBrowseSettings();
    const { mutateAsync: editSettings } = useEditSettings();
    const navigate = useNavigate();
    const handleError = useSettingsHandleError();

    const settings = settingsData?.settings ?? [];
    const [newslettersEnabled, membersSignupAccess] = getSettingValues<string>(settings, ["editor_default_email_recipients", "members_signup_access"]);

    const isDisabled = membersSignupAccess === "none";
    const isEnabled = newslettersEnabled !== "disabled" && !isDisabled;

    const handleToggleChange = async (checked: boolean) => {
        const updates: Setting[] = [
            { key: "editor_default_email_recipients", value: checked ? "visibility" : "disabled" },
        ];

        if (!checked) {
            updates.push({ key: "editor_default_email_recipients_filter", value: null });
        }

        try {
            await editSettings(updates);
        } catch (error) {
            handleError(error);
        }
    };

    return (
        <SettingGroup
            customButtons={(
                <Switch
                    aria-label="Newsletters"
                    checked={isEnabled}
                    disabled={isDisabled}
                    onCheckedChange={(checked) => void handleToggleChange(checked)}
                />
            )}
            description="Newsletter features are active, posts can be sent by email"
            keywords={keywords}
            navid="enable-newsletters"
            testId="enable-newsletters"
            title="Newsletter sending"
        >
            <SettingGroupContent
                columns={1}
                values={[
                    {
                        key: "private",
                        value: isEnabled ? (
                            <div className="w-full">
                                <div className="flex items-center gap-2">
                                    <LucideIcon.Check className="size-4 text-state-success" />
                                    <span>Enabled</span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full">
                                <div className="flex items-center gap-2 text-foreground">
                                    <LucideIcon.MailX className="size-4 text-muted-foreground" />
                                    <span>Disabled</span>
                                </div>
                                {isDisabled && (
                                    <Banner className="mt-6" size="sm" variant="default">
                                        Your <button className="underline!" type="button" onClick={() => navigate("/settings/members")}>Subscription access</button> is set to &lsquo;Nobody&rsquo;, which disables all newsletter sending. Change to &lsquo;Invite-only&rsquo; to send newsletters to existing members without allowing new signups.
                                    </Banner>
                                )}
                            </div>
                        ),
                    },
                ]}
            />
        </SettingGroup>
    );
}
