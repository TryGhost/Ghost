import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { type Theme, useBrowseThemes } from "@tryghost/admin-x-framework/api/themes";
import { downloadFile, getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { useLocation, useNavigate } from "@tryghost/admin-x-framework";

import { useThemeLimits } from "./use-theme-limits";
import { SettingGroup, SettingGroupContent } from "@/settings/app/shared/setting-group";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";

/**
 * The Theme group, ported from the legacy change-theme.tsx: active theme
 * summary with the edit-code/download menu and the limit-checked "Change
 * theme" entry into the gallery dialog.
 */
export function ThemeGroup({ keywords }: { keywords: string[] }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { showLimit } = useConfirmation();
    const { checkThemeLimitError, isReady, noThemeChangesAllowed } = useThemeLimits();
    const { data: themesData } = useBrowseThemes();
    const activeTheme = themesData?.themes.find((theme: Theme) => theme.active);

    const openThemeGallery = () => {
        if (!isReady) {
            return;
        }

        const error = noThemeChangesAllowed ? checkThemeLimitError() : null;
        if (error) {
            showLimit({
                prompt: error,
                onOk: () => navigate("/pro", { crossApp: true }),
            });
            return;
        }

        navigate("/settings/design/change-theme");
    };

    const openThemeEditor = () => {
        if (!activeTheme || !isReady) {
            return;
        }

        const error = checkThemeLimitError(".");
        if (error) {
            showLimit({
                prompt: error,
                onOk: () => navigate("/pro", { crossApp: true }),
            });
            return;
        }

        const from = pathname.replace(/^\/settings\/?/, "");
        navigate(`/settings/theme/edit/${encodeURIComponent(activeTheme.name)}?from=${encodeURIComponent(from)}`);
    };

    const downloadTheme = () => {
        if (!activeTheme) {
            return;
        }

        const { apiRoot } = getGhostPaths();
        downloadFile(`${apiRoot}/themes/${activeTheme.name}/download`);
    };

    return (
        <SettingGroup
            customButtons={<Button size="sm" variant="ghost" onClick={openThemeGallery}>Change theme</Button>}
            description="Browse and install official themes or upload one"
            keywords={keywords}
            navid="theme"
            testId="theme"
            title="Theme"
        >
            <SettingGroupContent>
                <div className="flex flex-col">
                    <h6 className="text-sm font-semibold">Active theme</h6>
                    <div className="mt-1 flex w-full items-center justify-between gap-4">
                        <div>{activeTheme ? `${activeTheme.name} (v${activeTheme.package?.version || "1.0"})` : "Loading..."}</div>
                        <div className="-mr-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-label="Menu" disabled={!activeTheme} size="icon" variant="ghost">
                                        <LucideIcon.Ellipsis className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={openThemeEditor}>Edit code</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={downloadTheme}>Download</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </SettingGroupContent>
        </SettingGroup>
    );
}
