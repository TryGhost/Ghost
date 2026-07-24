import { Button } from "@tryghost/shade/components";
import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useNavigate } from "@tryghost/admin-x-framework";

import FakeLogo from "./assets/portal-splash-default-logo.png";
import UserAddIcon from "./assets/portal-splash-user-add.png";
import { SettingGroup } from "@/settings/app/shared/setting-group";

/**
 * The Signup portal group, ported from the legacy membership/portal.tsx: the
 * static signup-splash illustration with the Customize button opening the
 * routed portal dialog.
 */

function SignupOptionImage({ title, color, price }: { color: string; title: string; price: string }) {
    return (
        <div className="rounded-lg bg-gray-100/70 px-3 pt-1.5 pb-3">
            <div className="text-[1.5rem] font-bold" style={{ color }}>{title}</div>
            <div className="-mt-1 text-[1.7rem] font-bold">{price}</div>
            <div className="mt-5 flex flex-col gap-1.5">
                <div className="h-1.5 w-[100%] bg-gray-300/60"></div>
                <div className="h-1.5 w-[70%] bg-gray-300/60"></div>
                <div className="h-1.5 w-[90%] bg-gray-300/60"></div>
            </div>
        </div>
    );
}

export function PortalGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();
    const { data: settingsData } = useBrowseSettings();
    const settings = settingsData?.settings ?? [];
    const [accentColor, icon, membersSignupAccess] = getSettingValues<string>(settings, ["accent_color", "icon", "members_signup_access"]);

    const color = accentColor || "#F6414E";

    return (
        <SettingGroup
            customButtons={<Button className="mt-[-5px]" disabled={membersSignupAccess === "none"} size="sm" variant="ghost" onClick={() => navigate("/settings/portal/edit")}>Customize</Button>}
            description="Customize members modal signup flow"
            keywords={keywords}
            navid="portal"
            testId="portal"
            title="Signup portal"
        >
            {/* The splash mirrors what Portal renders on the site, so it keeps its own light palette. */}
            <div className="relative isolate -mx-5 -mb-5 hidden flex-col items-center justify-end overflow-hidden rounded-b-xl bg-gray-100/60 px-5 pt-6 text-black sm:flex md:-mx-7 md:-mb-7">
                <div className="absolute right-6 bottom-6 flex size-12 items-center justify-center rounded-full text-white shadow-lg" style={{ backgroundColor: color }}>
                    <img alt="" className="size-6" src={UserAddIcon} />
                </div>
                <div className="grid w-full max-w-[440px] grid-cols-3 gap-5 rounded-t-xl bg-white px-9 py-6 shadow-xl">
                    <div className="col-span-3 mb-1 flex flex-col items-center justify-center">
                        {icon ? (
                            <div className="size-6 rounded-sm bg-cover bg-center" style={{ backgroundImage: `url(${icon})` }} />
                        ) : (
                            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-full p-1 text-white" style={{ backgroundColor: color }}>
                                <img alt="" className="h-auto w-5" src={FakeLogo} />
                            </div>
                        )}
                        <div className="mt-1.5 text-lg font-bold">
                            Sign up
                        </div>
                        <div className="mt-1.5 flex h-6 w-1/2 items-center rounded border border-gray-200 p-2 text-sm text-gray-700">
                            jamie@example.com
                        </div>
                    </div>
                    <SignupOptionImage color={color} price="$0" title="Free" />
                    <SignupOptionImage color={color} price="$5" title="Silver" />
                    <SignupOptionImage color={color} price="$10" title="Gold" />
                </div>
            </div>
        </SettingGroup>
    );
}
