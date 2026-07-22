import validator from "validator";
import { Switch } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { type Setting, getSettingValues, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { useNavigate } from "@tryghost/admin-x-framework";

import networkImage from "./assets/network.png";
import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { useLimiter } from "@/settings/app/shared/use-limiter";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Network group, ported from the legacy growth/network.tsx: an
 * immediate-save toggle with the same disabled rules (host limit, subdirectory
 * /localhost/IP hosting in production, private mode).
 */
export function NetworkGroup({ keywords }: { keywords: string[] }) {
    const { data: settingsData } = useBrowseSettings();
    const { mutateAsync: editSettings } = useEditSettings();
    const handleError = useSettingsHandleError();
    const navigate = useNavigate();

    const settings = settingsData?.settings ?? [];

    // The Network toggle is disabled in Admin settings if:
    // 1. (Ghost (Pro) only) the feature is disabled by config
    // 2. The site is hosted on a subdirectory, localhost or an IP address in production
    // 3. The site is in private mode
    const limiter = useLimiter();
    const isDisabledByConfig = limiter.isDisabled("limitSocialWeb");

    const { subdir } = getGhostPaths();
    const isProduction = process.env.NODE_ENV === "production";
    const [isPrivate] = getSettingValues<boolean>(settings, ["is_private"]);
    const isHostedOnSubdirectory = isProduction && !!subdir;
    const isHostedOnLocalhost = isProduction && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    const isHostedOnIP = isProduction && validator.isIP(window.location.hostname);

    const isDisabledByHosting = isDisabledByConfig || isHostedOnSubdirectory || isHostedOnLocalhost || isHostedOnIP;
    const isDisabledByPrivateMode = !!isPrivate;
    const isDisabled = isDisabledByHosting || isDisabledByPrivateMode;

    const [socialWebSetting] = getSettingValues<boolean>(settings, ["social_web"]);
    const isChecked = !!socialWebSetting && !isDisabled;

    const toggleSocialWebSetting = async (checked: boolean) => {
        const updatedSetting: Setting[] = [
            { key: "social_web", value: checked },
        ];

        try {
            await editSettings(updatedSetting);
        } catch (error) {
            handleError(error);
        }
    };

    return (
        <SettingGroup
            customButtons={(
                <Switch
                    aria-label="Network"
                    checked={isChecked}
                    disabled={isDisabled}
                    onCheckedChange={(checked) => void toggleSocialWebSetting(checked)}
                />
            )}
            description="Distribute posts to the social web, so people can discover and follow your content across BlueSky, Threads, Mastodon, Flipboard, WordPress, and more."
            keywords={keywords}
            navid="network"
            testId="network"
            title="Network"
        >
            <SettingGroupContent columns={1}>
                {isDisabled && (
                    <div className="flex w-full gap-1.5 rounded-md border border-border bg-muted p-3">
                        <LucideIcon.Info className="mt-0.5 size-4 shrink-0" />
                        <div>
                            {isDisabledByPrivateMode
                                ? <>Network is automatically disabled while your site is in <button className="cursor-pointer text-primary" type="button" onClick={() => navigate("/settings/members")}>private mode</button></>
                                : <>You need to configure a supported custom domain to use this feature. <a className="text-primary" href="https://ghost.org/help/social-web/#custom-domain-required" rel="noopener noreferrer" target="_blank">Help &rarr;</a></>}
                        </div>
                    </div>
                )}
                <div className="-mx-5 -mb-5 overflow-hidden rounded-b-xl md:-mx-7 md:-mb-7">
                    <img alt="Illustration of the Ghost social web network" src={networkImage} />
                </div>
            </SettingGroupContent>
        </SettingGroup>
    );
}
