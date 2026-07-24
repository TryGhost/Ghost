import { type ReactNode } from "react";
import { Switch } from "@tryghost/shade/components";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@tryghost/admin-x-framework";
import { type ConfigResponseType, configDataType } from "@tryghost/admin-x-framework/api/config";
import { getSettingValue, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";

import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * A labs flag toggle, ported from the legacy labs/feature-toggle.tsx: saves
 * the labs JSON setting and pokes the cached config's labs so flag-gated UI
 * flips immediately. Optional confirmation runs through the shared
 * confirmation dialog.
 */

export interface FeatureToggleConfirmationProps {
    title: string;
    prompt: ReactNode;
    okLabel: string;
    okRunningLabel?: string;
}

export interface FeatureToggleProps {
    flag: string;
    label?: string;
    disabled?: boolean;
    confirmation?: FeatureToggleConfirmationProps;
}

export function FeatureToggle({ label, flag, disabled, confirmation }: FeatureToggleProps) {
    const { data: settingsData } = useBrowseSettings();
    const settings = settingsData?.settings ?? [];
    const labs = JSON.parse(getSettingValue<string>(settings, "labs") || "{}") as Record<string, boolean>;
    const { mutateAsync: editSettings } = useEditSettings();
    const client = useQueryClient();
    const handleError = useSettingsHandleError();
    const { confirm } = useConfirmation();
    const isEnabled = Boolean(labs[flag]);

    const saveFeatureValue = async (newValue: boolean) => {
        try {
            await editSettings([{
                key: "labs",
                value: JSON.stringify({ ...labs, [flag]: newValue }),
            }]);
            trackEvent("Feature Toggled", { state: newValue ? "on" : "off", feature: flag });
            client.setQueriesData({ queryKey: [configDataType] }, (current) => ({
                config: {
                    ...(current as ConfigResponseType).config,
                    labs: {
                        ...(current as ConfigResponseType).config.labs,
                        [flag]: newValue,
                    },
                },
            }));
            return true;
        } catch (e) {
            handleError(e);
            return false;
        }
    };

    return (
        <Switch
            aria-label={label || flag}
            checked={isEnabled}
            disabled={disabled}
            name={`feature-${flag}`}
            onCheckedChange={(newValue) => {
                if (confirmation && newValue) {
                    confirm({
                        title: confirmation.title,
                        prompt: confirmation.prompt,
                        okLabel: confirmation.okLabel,
                        okRunningLabel: confirmation.okRunningLabel ?? "Enabling...",
                        onOk: async () => {
                            const saved = await saveFeatureValue(newValue);
                            if (!saved) {
                                throw new Error("Feature toggle failed");
                            }
                        },
                    });
                    return;
                }

                void saveFeatureValue(newValue);
            }}
        />
    );
}
