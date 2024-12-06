import React from "react";
import TopLevelGroup from "../../TopLevelGroup";
import { Toggle, withErrorBoundary } from "@tryghost/admin-x-design-system";
import {
    getSettingValues,
    Setting,
    useEditSettings,
} from "@tryghost/admin-x-framework/api/settings";
import useSettingGroup from "../../../hooks/useSettingGroup";

const ProgressiveWebApp: React.FC<{ keywords: string[] }> = ({ keywords }) => {
    const { localSettings } = useSettingGroup();

    const [pwa] = getSettingValues(localSettings, ["pwa"]) as boolean[];  
    const { mutateAsync: editSettings } = useEditSettings();

    const handleToggleChange = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const updates: Setting[] = [{ key: "pwa", value: e.target.checked }];

        await editSettings(updates);
    };

    return (
        <TopLevelGroup
            keywords={keywords}
            navid="pwa"
            testId="pwa"
            title="Progressive web app"
        >
            <Toggle
                checked={pwa ?? false}
                direction="rtl"
                gap="gap-0"
                label="Install your site as an app on mobile devices"
                labelClasses="w-full"
                onChange={handleToggleChange}
            />
        </TopLevelGroup>
    );
};

export default withErrorBoundary(ProgressiveWebApp, "Progressive web app");
