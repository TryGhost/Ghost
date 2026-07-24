import { Button } from "@tryghost/shade/components";
import { useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useNavigate } from "@tryghost/admin-x-framework";

import DesignSettingsImg from "./assets/design-settings.png";
import { ThemeGroup } from "./theme-group";
import { siteKeywords } from "@/settings/app/nav";
import { SettingGroup } from "@/settings/app/shared/setting-group";

/**
 * The Site settings area, rebuilt natively: the same groups in the same
 * order as the legacy site-settings.tsx — design & branding, theme,
 * navigation, and the announcement bar, each opening its routed dialog.
 * Waits for the settings response so group state starts from real settings.
 */

function CustomizeButton({ label = "Customize", onClick }: { label?: string; onClick: () => void }) {
    return <Button size="sm" variant="ghost" onClick={onClick}>{label}</Button>;
}

function DesignGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();

    return (
        <SettingGroup
            customButtons={<CustomizeButton onClick={() => navigate("/settings/design/edit")} />}
            description="Customize the style and layout of your site"
            keywords={keywords}
            navid="design"
            testId="design"
            title="Design & branding"
        >
            <img alt="Design settings" src={DesignSettingsImg} />
        </SettingGroup>
    );
}

function NavigationGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();

    return (
        <SettingGroup
            customButtons={<CustomizeButton onClick={() => navigate("/settings/navigation/edit")} />}
            description="Set up primary and secondary menus"
            keywords={keywords}
            navid="navigation"
            testId="navigation"
            title="Navigation"
        />
    );
}

function AnnouncementBarGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();

    return (
        <SettingGroup
            customButtons={<CustomizeButton onClick={() => navigate("/settings/announcement-bar/edit")} />}
            description="Highlight important updates or offers"
            keywords={keywords}
            navid="announcement-bar"
            testId="announcement-bar"
            title="Announcement bar"
        />
    );
}

export function SiteArea() {
    const { data: settingsData } = useBrowseSettings();

    if (!settingsData) {
        return null;
    }

    return (
        <div className="flex flex-col gap-9">
            <DesignGroup keywords={siteKeywords.design} />
            <ThemeGroup keywords={siteKeywords.theme} />
            <NavigationGroup keywords={siteKeywords.navigation} />
            <AnnouncementBarGroup keywords={siteKeywords.announcementBar} />
        </div>
    );
}
