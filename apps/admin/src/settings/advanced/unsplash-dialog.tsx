import { useEffect, useState } from "react";
import { Field, FieldContent, FieldDescription, FieldLabel, Switch } from "@tryghost/shade/components";
import { type Setting, getSettingValues, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";

import { IntegrationDialog } from "./integration-dialog";
import { IntegrationIcon } from "./integration-icon";
import { useSaveLabel } from "./use-save-label";

/** The Unsplash configuration dialog (`/settings/integrations/unsplash`), ported from the legacy unsplash-modal.tsx. */
export function UnsplashDialog() {
    const { data: settingsData } = useBrowseSettings();
    const settings = settingsData?.settings ?? [];
    const [unsplashEnabled] = getSettingValues<boolean>(settings, ["unsplash"]);
    const { mutateAsync: editSettings } = useEditSettings();
    const { label: okLabel, run, colorClass } = useSaveLabel();
    const [enabled, setEnabled] = useState<boolean>(Boolean(unsplashEnabled));

    useEffect(() => {
        setEnabled(unsplashEnabled || false);
    }, [unsplashEnabled]);

    const handleSave = async () => {
        const updates: Setting[] = [{ key: "unsplash", value: enabled }];
        await run(() => editSettings(updates));
    };

    return (
        <IntegrationDialog
            detail="Beautiful, free photos"
            dirty={enabled !== Boolean(unsplashEnabled)}
            icon={<IntegrationIcon name="unsplash" size={48} />}
            okColorClass={colorClass}
            okLabel={okLabel}
            testId="unsplash-modal"
            title="Unsplash"
            onOk={handleSave}
        >
            <Field orientation="horizontal">
                <FieldContent>
                    <FieldLabel htmlFor="unsplash-enabled">Enable Unsplash</FieldLabel>
                    <FieldDescription>Enable <a className="text-state-success" href="https://unsplash.com" rel="noopener noreferrer" target="_blank">Unsplash</a> image integration for your posts</FieldDescription>
                </FieldContent>
                <Switch checked={enabled} id="unsplash-enabled" onCheckedChange={setEnabled} />
            </Field>
        </IntegrationDialog>
    );
}
