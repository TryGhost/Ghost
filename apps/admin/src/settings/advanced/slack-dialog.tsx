import validator from "validator";
import { toast } from "sonner";
import { Button } from "@tryghost/shade/components";
import { getSettingValues, useTestSlack } from "@tryghost/admin-x-framework/api/settings";

import { IntegrationDialog } from "./integration-dialog";
import { IntegrationIcon } from "./integration-icon";
import { TextField } from "@/settings/app/shared/text-field";
import { showToast } from "@/settings/app/shared/toast";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

/** The Slack configuration dialog (`/settings/integrations/slack`), ported from the legacy slack-modal.tsx. */
export function SlackDialog() {
    const { localSettings, updateSetting, handleSave, validate, errors, clearError, okProps } = useSettingGroup({
        savingDelay: 500,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (slackUrl && !validator.isURL(slackUrl, { require_protocol: true })) {
                newErrors.slackUrl = "The URL must be in a format like https://hooks.slack.com/services/<your personal key>";
            }

            return newErrors;
        },
    });
    const [slackUrl, slackUsername] = getSettingValues<string>(localSettings, ["slack_url", "slack_username"]);

    const { mutateAsync: testSlack } = useTestSlack();

    const handleTestClick = async () => {
        toast.dismiss();
        if (await handleSave()) {
            await testSlack(null);
            showToast({ title: "Check your Slack channel for the test message", type: "info" });
        }
    };

    const isDirty = localSettings.some((setting) => setting.dirty);

    return (
        <IntegrationDialog
            detail="A messaging app for teams"
            dirty={isDirty}
            icon={<IntegrationIcon name="slack" size={56} />}
            okLabel={okProps.label || "Save"}
            testId="slack-modal"
            title="Slack"
            onOk={async () => {
                toast.dismiss();
                await handleSave();
            }}
        >
            <div className="flex flex-col gap-6">
                <h6 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Slack configuration</h6>
                <TextField
                    error={Boolean(errors.slackUrl)}
                    hint={errors.slackUrl || (
                        <>Automatically send newly published posts to a channel in Slack or any Slack-compatible service like Discord or Mattermost. Set up a new incoming webhook <a href="https://my.slack.com/apps/new/A0F7XDUAZ-incoming-webhooks" rel="noopener noreferrer" target="_blank">here</a>, and grab the URL.</>
                    )}
                    placeholder="https://hooks.slack.com/services/..."
                    title="Webhook URL"
                    value={slackUrl}
                    onBlur={validate}
                    onChange={(e) => updateSetting("slack_url", e.target.value)}
                    onKeyDown={() => clearError("slackUrl")}
                />
                <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
                    <div className="grow">
                        <TextField
                            hint="The username to display messages from"
                            title="Username"
                            value={slackUsername}
                            onChange={(e) => updateSetting("slack_username", e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={() => void handleTestClick()}>Send test notification</Button>
                </div>
            </div>
        </IntegrationDialog>
    );
}
