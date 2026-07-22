import { type ReactNode, useState } from "react";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { JSONError } from "@tryghost/admin-x-framework/errors";
import {
    type Theme,
    isActiveTheme,
    isDefaultTheme,
    isDeletableTheme,
    isLegacyTheme,
    useActivateTheme,
    useActiveTheme,
    useDeleteTheme,
} from "@tryghost/admin-x-framework/api/themes";
import { downloadFile, getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { useLocation, useNavigate } from "@tryghost/admin-x-framework";

import { useThemeLimits } from "./use-theme-limits";
import { type FatalErrors, InvalidThemeDialog, type InvalidThemeState } from "./theme-result-dialogs";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";

/**
 * The Installed tab of the change-theme dialog, ported from the legacy
 * theme/advanced-theme-settings.tsx: active-first list with activate,
 * download, delete and edit-code actions per theme.
 */

function getThemeLabel(theme: Theme): ReactNode {
    const baseName = theme.package?.name || theme.name;
    let label: ReactNode = baseName;

    if (isDefaultTheme(theme)) {
        label = `${baseName} (default)`;
    } else if (isLegacyTheme(theme)) {
        label = `${baseName} (legacy)`;
    } else if (theme.package?.name !== theme.name) {
        label = (
            <span className="md:text-base">
                {label} <span className="text-muted-foreground">({theme.name})</span>
            </span>
        );
    }

    if (isActiveTheme(theme)) {
        label = (
            <span className="font-bold md:text-base">
                {label} &mdash; <span className="text-green"> Active</span>
            </span>
        );
    }

    return label;
}

function getThemeVersion(theme: Theme): string {
    return theme.package?.version || "1.0";
}

function ThemeActions({ theme, onShowInvalid }: { theme: Theme; onShowInvalid: (state: InvalidThemeState) => void }) {
    const { mutateAsync: activateTheme } = useActivateTheme();
    const { mutateAsync: deleteTheme } = useDeleteTheme();
    const activeThemeQuery = useActiveTheme();
    const handleError = useSettingsHandleError();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { checkThemeLimitError } = useThemeLimits();
    const { confirm, showLimit } = useConfirmation();

    const handleActivate = async () => {
        try {
            await activateTheme(theme.name);
            void activeThemeQuery.refetch();
            showToast({
                title: "Theme activated",
                type: "success",
                message: <div><span className="capitalize">{theme.name}</span> is now your active theme</div>,
            });
        } catch (e) {
            let fatalErrors: FatalErrors | null = null;
            if (e instanceof JSONError && e.response?.status === 422 && e.data?.errors) {
                fatalErrors = e.data.errors as unknown as FatalErrors;
            } else {
                handleError(e);
            }

            if (fatalErrors) {
                onShowInvalid({
                    title: "Theme not activated",
                    prompt: <>This theme couldn&apos;t be activated because Ghost found a blocking validation error. Fix the issue below and try again.</>,
                    fatalErrors,
                    onRetry: () => void handleActivate(),
                });
            }
        }
    };

    const handleDownload = () => {
        const { apiRoot } = getGhostPaths();
        downloadFile(`${apiRoot}/themes/${theme.name}/download`);
    };

    const handleDelete = () => {
        confirm({
            title: "Are you sure you want to delete this?",
            prompt: (
                <>
                    You are about to delete <strong>&quot;{theme.name}&quot;.</strong> This is permanent! We warned you, k?
                    Maybe download{" "}
                    <span className="cursor-pointer text-green-500" onClick={handleDownload}>
                        your theme before continuing
                    </span>
                </>
            ),
            okLabel: "Delete",
            okRunningLabel: "Deleting",
            destructive: true,
            onOk: async () => {
                await deleteTheme(theme.name);
            },
        });
    };

    const handleEditCode = () => {
        const limitError = checkThemeLimitError(".");

        if (limitError) {
            showLimit({ prompt: limitError });
            return;
        }

        const from = pathname.replace(/^\/settings\/?/, "");
        navigate(`/settings/theme/edit/${encodeURIComponent(theme.name)}?from=${encodeURIComponent(from)}`);
    };

    return (
        <div className="-mr-3 flex items-center gap-4">
            {!isActiveTheme(theme) && (
                <Button className="text-green" variant="link" onClick={() => void handleActivate()}>Activate</Button>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button aria-label="Menu" size="icon" variant="ghost"><LucideIcon.Ellipsis className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={handleEditCode}>Edit code</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleDownload}>Download</DropdownMenuItem>
                    {isDeletableTheme(theme) && (
                        <DropdownMenuItem onSelect={handleDelete}>Delete</DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export function InstalledThemesList({ themes }: { themes: Theme[] }) {
    const [invalidState, setInvalidState] = useState<InvalidThemeState | null>(null);

    const sorted = [...themes].sort((a, b) => {
        if (a.active && !b.active) {
            return -1;
        } else if (!a.active && b.active) {
            return 1;
        }
        if (a.package?.name && b.package?.name) {
            return a.package.name.localeCompare(b.package.name);
        }
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="mx-auto w-full max-w-[800px] px-[8vmin] pb-[8vmin]">
            <h1 className="pt-[4vmin] pb-2 text-3xl font-bold tracking-tight">Installed themes</h1>
            <div className="mt-4 flex flex-col">
                {sorted.map((theme) => (
                    <div key={theme.name} className="flex items-center justify-between gap-4 py-3" data-testid="theme-list-item" id={`theme-${theme.name}`}>
                        <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm">{getThemeLabel(theme)}</span>
                            <span className="text-sm text-muted-foreground">{getThemeVersion(theme)}</span>
                        </div>
                        <ThemeActions theme={theme} onShowInvalid={setInvalidState} />
                    </div>
                ))}
            </div>
            {invalidState && <InvalidThemeDialog state={invalidState} onClose={() => setInvalidState(null)} />}
        </div>
    );
}
