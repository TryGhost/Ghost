import { useEffect, useState } from "react";
import { Field, FieldContent, FieldDescription, FieldLabel, Switch } from "@tryghost/shade/components";
import { type Setting, getSettingValues, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";

import { IntegrationDialog } from "./integration-dialog";
import { IntegrationIcon } from "./integration-icon";
import { useSaveLabel } from "./use-save-label";
import { TextField } from "@/settings/app/shared/text-field";

/** The FirstPromoter configuration dialog (`/settings/integrations/firstpromoter`), ported from the legacy first-promoter-modal.tsx. */
export function FirstPromoterDialog() {
    const { data: settingsData } = useBrowseSettings();
    const settings = settingsData?.settings ?? [];
    const { mutateAsync: editSettings } = useEditSettings();
    const { label: okLabel, run, colorClass } = useSaveLabel();

    const [firstPromoterEnabled] = getSettingValues<boolean>(settings, ["firstpromoter"]);
    const [firstPromoterId] = getSettingValues<string>(settings, ["firstpromoter_id"]);

    const [enabled, setEnabled] = useState<boolean>(Boolean(firstPromoterEnabled));
    const [accountId, setAccountId] = useState<string | null>("");

    useEffect(() => {
        setEnabled(firstPromoterEnabled || false);
        setAccountId(firstPromoterId || null);
    }, [firstPromoterEnabled, firstPromoterId]);

    const handleSave = async () => {
        // The legacy modal always sends both keys, not just dirty ones.
        const updates: Setting[] = [
            { key: "firstpromoter", value: enabled },
            { key: "firstpromoter_id", value: accountId },
        ];
        await run(() => editSettings(updates));
    };

    return (
        <IntegrationDialog
            detail="Launch your own member referral program"
            dirty={enabled !== Boolean(firstPromoterEnabled) || (accountId || null) !== (firstPromoterId || null)}
            icon={<IntegrationIcon className="-mt-2" name="firstpromoter" size={56} />}
            okColorClass={colorClass}
            okLabel={okLabel}
            testId="firstpromoter-modal"
            title="FirstPromoter"
            onOk={handleSave}
        >
            <div className="flex flex-col gap-6">
                <Field orientation="horizontal">
                    <FieldContent>
                        <FieldLabel htmlFor="firstpromoter-enabled">Enable FirstPromoter</FieldLabel>
                        <FieldDescription>Enable <a className="text-state-success" href="https://firstpromoter.com/?fpr=ghost&fp_sid=admin" rel="noopener noreferrer" target="_blank">FirstPromoter</a> for tracking referrals</FieldDescription>
                    </FieldContent>
                    <Switch checked={enabled} id="firstpromoter-enabled" onCheckedChange={setEnabled} />
                </Field>
                {enabled && (
                    <TextField
                        hint={<>Affiliate and referral tracking, find your ID <a className="text-state-success" href="https://ghost.org/help/firstpromoter-id/" rel="noopener noreferrer" target="_blank">here</a></>}
                        placeholder="XXXXXXXX"
                        title="FirstPromoter account ID"
                        value={accountId || ""}
                        onChange={(e) => setAccountId(e.target.value)}
                    />
                )}
            </div>
        </IntegrationDialog>
    );
}
