import { useEffect, useState } from "react";
import { Button, Field, FieldContent, FieldDescription, FieldLabel, Separator, Switch } from "@tryghost/shade/components";
import { LucideIcon, abbreviateNumber } from "@tryghost/shade/utils";
import { type Setting, getSettingValue, getSettingValues, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseMembers } from "@tryghost/admin-x-framework/api/members";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useNavigate } from "@tryghost/admin-x-framework";

import exploreImage from "./assets/ghost-explore.png";
import fakeLogo from "./assets/explore-default-logo.png";
import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Ghost Explore group, ported from the legacy growth/explore.tsx:
 * immediate-save toggles for explore_ping/explore_ping_growth, the site card
 * preview (a fixed-light surface, hence the literal colors), and the
 * testimonial call-to-action.
 */
export function ExploreGroup({ keywords }: { keywords: string[] }) {
    const { data: settingsData } = useBrowseSettings();
    const { data: siteResponse } = useBrowseSite();
    const { mutateAsync: editSettings } = useEditSettings();
    const handleError = useSettingsHandleError();
    const navigate = useNavigate();

    const settings = settingsData?.settings ?? [];
    const siteData = siteResponse?.site ?? null;

    // Member count for the preview badge.
    const { refetch: fetchMembers } = useBrowseMembers({
        searchParams: { limit: "1" },
    });
    const [membersCount, setMembersCount] = useState(0);
    useEffect(() => {
        const fetchMemberCount = async () => {
            const { data: members } = await fetchMembers();
            const count = members?.meta?.pagination?.total || 0;
            setMembersCount(count);
        };

        void fetchMemberCount();
    }, [fetchMembers]);

    const [accentColor, icon, title, description] = getSettingValues<string>(settings, ["accent_color", "icon", "title", "description"]);
    const exploreEnabled = Boolean(getSettingValue<boolean>(settings, "explore_ping"));
    const shareGrowthData = Boolean(getSettingValue<boolean>(settings, "explore_ping_growth"));

    const url = siteData?.url;
    const siteDomain = url?.replace(/^https?:\/\//, "").replace(/\/?$/, "");

    const color = accentColor || "#F6414E";

    const toggleSetting = async (key: string, checked: boolean) => {
        const updatedSetting: Setting[] = [
            { key, value: checked },
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
                    aria-label="Ghost Explore"
                    checked={exploreEnabled}
                    data-testid="explore-toggle"
                    onCheckedChange={(checked) => void toggleSetting("explore_ping", checked)}
                />
            )}
            description="Promote your site across Ghost's website and publishing network"
            keywords={keywords}
            navid="explore"
            testId="explore"
            title="Ghost Explore"
        >
            {exploreEnabled ? (
                <SettingGroupContent columns={1}>
                    <Separator />
                    <Field orientation="horizontal">
                        <FieldContent>
                            <FieldLabel htmlFor="explore-growth-toggle">Share growth data to rank higher?</FieldLabel>
                            <FieldDescription>Enabling this will use your revenue/member growth data to rank your site more highly on Ghost Explore. Total member count will be displayed publicly, other data will be kept private.</FieldDescription>
                        </FieldContent>
                        <Switch
                            checked={Boolean(shareGrowthData)}
                            data-testid="explore-growth-toggle"
                            id="explore-growth-toggle"
                            onCheckedChange={(checked) => void toggleSetting("explore_ping_growth", checked)}
                        />
                    </Field>
                    {/* The preview card is a fixed-light surface (matches the Explore listing), so literal grays by design. */}
                    <div className="-mx-5 -mb-5 flex flex-col items-center bg-muted px-7 py-10 md:-mx-7 md:-mb-7" data-testid="explore-preview">
                        <div className="relative w-full max-w-[320px] rounded-lg bg-white p-6 text-black shadow-lg">
                            <div className="absolute top-2.5 right-3 text-sm text-gray-300 uppercase">Preview</div>
                            {icon ? (
                                <div className="size-9 rounded-sm bg-cover bg-center" style={{ backgroundImage: `url(${icon})` }} />
                            ) : (
                                <div className="flex aspect-square size-10 items-center justify-center overflow-hidden rounded-full p-1 text-white" style={{ backgroundColor: color }}>
                                    <img alt="" className="h-auto w-8" src={fakeLogo} />
                                </div>
                            )}
                            <div className="mt-3 text-lg font-semibold tracking-tight">{title}</div>
                            {description && (
                                <div className="mt-0.5 leading-tight text-gray-600">{description}</div>
                            )}
                            <a className="group mt-8 flex h-6 w-full items-center justify-between gap-5 hover:cursor-pointer" href={url} rel="noopener noreferrer" target="_blank">
                                <span className="font-semibold">{siteDomain}</span>
                                {shareGrowthData ? (
                                    <span className="rounded-sm bg-black px-2 py-0.5 text-sm font-semibold text-white" data-testid="explore-members-count">
                                        {abbreviateNumber(membersCount)}&nbsp;{membersCount === 1 ? "member" : "members"}
                                    </span>
                                ) : (
                                    <span className="flex size-5 items-center justify-center rounded-full border border-black text-black group-hover:bg-black group-hover:text-white">
                                        <LucideIcon.ArrowRight className="size-2.5" />
                                    </span>
                                )}
                            </a>
                        </div>
                    </div>
                    {/* Brand-purple banner: fixed decorative colors in both themes, matching legacy. */}
                    <div className="-mx-5 -mb-5 flex items-center justify-between gap-4 rounded-b-xl border-t border-[rgba(142,66,255,0.1)] bg-gradient-to-tr from-[rgba(142,66,255,0.07)] to-[rgba(142,66,255,0.02)] p-6 px-7 md:-mx-7 md:-mb-7">
                        <div className="flex flex-col">
                            <span className="font-medium">Get featured on the Ghost.org homepage</span>
                            <span className="text-pretty text-foreground/80">Send us a quote we can use to highlight your site</span>
                        </div>
                        <Button
                            className="border border-[#8E42FF] bg-transparent text-[#8E42FF] hover:bg-[#8E42FF]/5 hover:text-[#8E42FF]"
                            variant="outline"
                            onClick={() => navigate("/settings/explore/testimonial")}
                        >
                            <LucideIcon.Send className="size-4" />
                            Send testimonial
                        </Button>
                    </div>
                </SettingGroupContent>
            ) : (
                <img alt="Ghost Explore" src={exploreImage} />
            )}
        </SettingGroup>
    );
}
