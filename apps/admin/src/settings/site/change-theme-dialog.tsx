import { type ReactNode, useEffect, useRef, useState } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Tabs,
    TabsList,
    TabsTrigger,
} from "@tryghost/shade/components";
import { JSONError } from "@tryghost/admin-x-framework/errors";
import {
    type Theme,
    type ThemesInstallResponseType,
    isDefaultOrLegacyTheme,
    useActivateTheme,
    useBrowseThemes,
    useInstallTheme,
    useUploadTheme,
} from "@tryghost/admin-x-framework/api/themes";
import { useLocation, useNavigate } from "@tryghost/admin-x-framework";

import { InstalledThemesList } from "./installed-themes-list";
import { type OfficialTheme } from "./official-themes";
import { OfficialThemesGrid } from "./official-themes-grid";
import { ThemePreviewScreen } from "./theme-preview-screen";
import {
    type FatalErrors,
    InvalidThemeDialog,
    type InvalidThemeState,
    ThemeInstalledDialog,
    type ThemeInstalledState,
} from "./theme-result-dialogs";
import { useThemeLimits } from "./use-theme-limits";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";

/**
 * The routed change-theme dialog, ported from the legacy theme-modal.tsx +
 * design-and-theme-modal.tsx route handling: `/settings/design/change-theme`
 * opens the gallery, `/settings/theme/install?source=…&ref=…` additionally
 * runs the marketplace install confirmation. Route-level host limit checks
 * redirect to `/settings/theme` with the limit dialog.
 */

function UploadThemeDialog({ onUpload, onClose }: { onUpload: (file: File) => void; onClose: () => void }) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent aria-describedby={undefined} className="max-h-[85vh] overflow-y-auto" data-testid="confirmation-modal">
                <DialogHeader>
                    <DialogTitle>Upload theme</DialogTitle>
                </DialogHeader>
                <label className="block cursor-pointer bg-muted p-10 text-center">
                    <span>Click to select or drag & drop zip file</span>
                    <input
                        accept=".zip"
                        type="file"
                        hidden
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                                onClose();
                                onUpload(file);
                            }
                        }}
                    />
                </label>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function UploadFailedDialog({ themeFileName, onClose }: { themeFileName: string; onClose: () => void }) {
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent aria-describedby={undefined} data-testid="confirmation-modal">
                <DialogHeader>
                    <DialogTitle>Upload failed</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                    <p>The default <strong>{themeFileName}</strong> theme cannot be overwritten.</p>
                    <p>Rename your zip file and try again.</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ChangeThemeContent({ installParams }: { installParams?: { source: string | null; ref: string | null } }) {
    const navigate = useNavigate();
    const { confirm, showLimit } = useConfirmation();
    const handleError = useSettingsHandleError();
    const { checkThemeLimitError, isThemeLimited, isReady: limitsReady } = useThemeLimits();
    const { data: { themes } = {} } = useBrowseThemes();
    const { mutateAsync: installTheme } = useInstallTheme();
    const { mutateAsync: activateTheme } = useActivateTheme();
    const { mutateAsync: uploadTheme } = useUploadTheme();

    const [currentTab, setCurrentTab] = useState("official");
    const [selectedTheme, setSelectedTheme] = useState<OfficialTheme | null>(null);
    const [isInstalling, setInstalling] = useState(false);
    const [isUploading, setUploading] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFailedName, setUploadFailedName] = useState<string | null>(null);
    const [installedState, setInstalledState] = useState<ThemeInstalledState | null>(null);
    const [invalidState, setInvalidState] = useState<InvalidThemeState | null>(null);
    const marketplaceInstallRequested = useRef(false);

    const closeModal = () => navigate("/settings");

    // Marketplace installs (theme/install?source=…&ref=…): confirm, install
    // and activate — the route-level guard has already cleared the limits.
    useEffect(() => {
        const source = installParams?.source;
        const themeRef = installParams?.ref;
        if (!source || !themeRef || !themes || marketplaceInstallRequested.current) {
            return;
        }
        marketplaceInstallRequested.current = true;

        const themeName = themeRef.split("/")[1];
        const existingThemeNames = themes.map((t) => t.name);
        const willOverwrite = existingThemeNames.includes(themeName.toLowerCase());
        const themeToOverwrite = willOverwrite ? themes[existingThemeNames.indexOf(themeName.toLowerCase())] : undefined;

        confirm({
            title: "Install Theme",
            prompt: (
                <>
                    By clicking below, <strong>{themeName}</strong> will automatically be activated as the theme for your site.
                    {willOverwrite && (
                        <>
                            <br />
                            <br />
                            This will overwrite your existing version of <strong>{themeName}</strong>{themeToOverwrite?.active ? " which is your active theme" : ""}. All custom changes will be lost.
                        </>
                    )}
                </>
            ),
            okLabel: "Install",
            okRunningLabel: "Installing...",
            cancelLabel: "Cancel",
            onOk: async () => {
                try {
                    const data = await installTheme(themeRef);
                    if (data?.themes[0]) {
                        await activateTheme(data.themes[0].name);
                        showToast({
                            title: "Theme activated",
                            type: "success",
                            message: <div><span className="capitalize">{data.themes[0].name}</span> is now your active theme</div>,
                        });
                    }
                    navigate("/settings");
                } catch (e) {
                    handleError(e);
                    throw e;
                }
            },
        });
    }, [activateTheme, confirm, handleError, installParams, installTheme, navigate, themes]);

    if (!themes) {
        return null;
    }

    const handleThemeUpload = async (file: File, { onActivate }: { onActivate?: () => void } = {}) => {
        let data: ThemesInstallResponseType | undefined;
        let fatalErrors: FatalErrors | null = null;

        try {
            setUploading(true);
            data = await uploadTheme({ file });
        } catch (e) {
            if (e instanceof JSONError && e.response?.status === 422 && e.data?.errors) {
                fatalErrors = e.data.errors as FatalErrors;
            } else {
                handleError(e);
            }
        } finally {
            setUploading(false);
        }

        if (fatalErrors && !data) {
            setInvalidState({
                title: "Theme not uploaded",
                prompt: <>This theme couldn&apos;t be uploaded because Ghost found a blocking validation error. Fix the issue below and upload the theme again.</>,
                fatalErrors,
                onRetry: () => setUploadOpen(true),
            });
        }

        if (!data) {
            return;
        }

        const uploadedTheme = data.themes[0];

        let title = "Upload successful";
        let prompt: ReactNode = <><strong>{uploadedTheme.name}</strong> uploaded</>;

        if (!uploadedTheme.active) {
            prompt = <>{prompt} Do you want to activate it now?</>;
        }

        if (uploadedTheme?.errors?.length || uploadedTheme.warnings?.length) {
            title = "Upload successful";
            prompt = <>The theme <strong>&quot;{uploadedTheme.name}&quot;</strong> was installed successfully.</>;

            if (!uploadedTheme.active) {
                prompt = <>{prompt} You can activate it when you&apos;re ready.</>;
            }
        }

        setInstalledState({ title, prompt, installedTheme: uploadedTheme, onActivate });
    };

    const onThemeUpload = (file: File) => {
        const themeFileName = file.name.replace(/\.zip$/, "");
        const existingThemeNames = themes.map((t) => t.name);
        if (isDefaultOrLegacyTheme({ name: themeFileName })) {
            setUploadFailedName(themeFileName);
        } else if (existingThemeNames.includes(themeFileName)) {
            confirm({
                title: "Overwrite theme",
                prompt: <>The theme <strong>{themeFileName}</strong> already exists. Do you want to overwrite it?</>,
                okLabel: "Overwrite",
                okRunningLabel: "Overwriting...",
                cancelLabel: "Cancel",
                destructive: true,
                onOk: async () => {
                    await handleThemeUpload(file, { onActivate: closeModal });
                    setCurrentTab("installed");
                },
            });
        } else {
            setCurrentTab("installed");
            void handleThemeUpload(file, { onActivate: closeModal });
        }
    };

    const handleUploadClick = () => {
        if (!limitsReady) {
            return;
        }

        if (isThemeLimited) {
            const error = checkThemeLimitError(".");
            showLimit({
                prompt: error || "Your current plan doesn't support uploading custom themes.",
                onOk: () => navigate("/pro", { crossApp: true }),
            });
            return;
        }

        setUploadOpen(true);
    };

    // Selected official-theme card: preview + install/update/activate.
    const installedTheme = selectedTheme
        ? themes.find((theme) => theme.name.toLowerCase() === selectedTheme.name.toLowerCase())
        : undefined;

    const performInstallation = async (selected: OfficialTheme, existing: Theme | undefined) => {
        let title = "Success";
        let prompt: ReactNode = <></>;
        let resultTheme = existing;

        // default themes can't be installed, only activated
        if (isDefaultOrLegacyTheme(selected)) {
            title = "Activate theme";
            prompt = <>By clicking below, <strong>{selected.name}</strong> will automatically be activated as the theme for your site.</>;
        } else {
            setInstalling(true);
            let data: ThemesInstallResponseType | undefined;
            try {
                data = await installTheme(selected.ref);
            } catch (e) {
                handleError(e);
            } finally {
                setInstalling(false);
            }

            if (!data) {
                return;
            }

            const newlyInstalledTheme = data.themes[0];

            title = "Success";
            prompt = <><strong>{newlyInstalledTheme.name}</strong> has been successfully installed.</>;

            if (!newlyInstalledTheme.active) {
                prompt = <>{prompt} Do you want to activate it now?</>;
            }

            if (newlyInstalledTheme.errors?.length || newlyInstalledTheme.warnings?.length) {
                title = "Installed successfully";
                prompt = <>The theme <strong>&quot;{newlyInstalledTheme.name}&quot;</strong> was installed successfully.</>;

                if (!newlyInstalledTheme.active) {
                    prompt = <>{prompt} You can activate it when you&apos;re ready.</>;
                }
            }

            resultTheme = newlyInstalledTheme;
        }

        if (!resultTheme) {
            return;
        }

        setInstalledState({
            title,
            prompt,
            installedTheme: resultTheme,
            onActivate: closeModal,
        });
    };

    const onInstall = selectedTheme ? () => {
        const limitError = checkThemeLimitError(selectedTheme.name);
        if (limitError) {
            showLimit({
                prompt: limitError,
                onOk: () => navigate("/pro", { crossApp: true }),
            });
            return;
        }

        if (installedTheme && !isDefaultOrLegacyTheme(selectedTheme)) {
            confirm({
                title: "Overwrite theme",
                prompt: <>This will overwrite your existing version of {selectedTheme.name}{installedTheme?.active ? ", which is your active theme" : ""}. All custom changes will be lost.</>,
                okLabel: "Overwrite",
                okRunningLabel: "Installing...",
                cancelLabel: "Cancel",
                destructive: true,
                onOk: async () => {
                    await performInstallation(selectedTheme, installedTheme);
                },
            });
            return;
        }

        void performInstallation(selectedTheme, installedTheme);
    } : undefined;

    return (
        <Dialog open onOpenChange={(open) => !open && closeModal()}>
            <DialogContent
                aria-describedby={undefined}
                className="inset-0 top-0 left-0 block h-dvh w-screen max-w-none translate-x-0 gap-0 overflow-y-auto rounded-none bg-background p-0 sm:rounded-none"
                data-testid="theme-modal"
            >
                <DialogTitle className="sr-only">Change theme</DialogTitle>
                <div className="relative flex min-h-full flex-col">
                    {selectedTheme && (
                        <ThemePreviewScreen
                            installedTheme={installedTheme}
                            isInstalling={isInstalling}
                            selectedTheme={selectedTheme}
                            onBack={() => setSelectedTheme(null)}
                            onInstall={onInstall}
                        />
                    )}
                    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-background px-6 py-4">
                        <Tabs value={currentTab} variant="button-sm" onValueChange={setCurrentTab}>
                            <TabsList>
                                <TabsTrigger value="official">Official themes</TabsTrigger>
                                <TabsTrigger value="installed">Installed</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={closeModal}>Close</Button>
                            <Button disabled={isUploading} variant="default" onClick={handleUploadClick}>
                                {isUploading ? "Uploading..." : "Upload theme"}
                            </Button>
                        </div>
                    </header>
                    {!selectedTheme && (
                        currentTab === "official"
                            ? <OfficialThemesGrid onSelectTheme={setSelectedTheme} />
                            : <InstalledThemesList themes={themes} />
                    )}
                </div>
            </DialogContent>
            {uploadOpen && <UploadThemeDialog onClose={() => setUploadOpen(false)} onUpload={onThemeUpload} />}
            {uploadFailedName && <UploadFailedDialog themeFileName={uploadFailedName} onClose={() => setUploadFailedName(null)} />}
            {installedState && <ThemeInstalledDialog state={installedState} onClose={() => setInstalledState(null)} />}
            {invalidState && <InvalidThemeDialog state={invalidState} onClose={() => setInvalidState(null)} />}
        </Dialog>
    );
}

export function ChangeThemeDialog({ install }: { install?: boolean }) {
    const navigate = useNavigate();
    const { search } = useLocation();
    const { showLimit } = useConfirmation();
    const { checkThemeLimitError, isReady, isThemeLimited, noThemeChangesAllowed } = useThemeLimits();
    const [blocked, setBlocked] = useState(false);

    const params = new URLSearchParams(search);
    const source = install ? params.get("source") : null;
    const themeRef = install ? params.get("ref") : null;

    // Route-level limit guard: single-theme allowlists block the gallery
    // outright; install deep links are checked against the requested theme.
    useEffect(() => {
        if (!isReady || blocked) {
            return;
        }

        let error: string | null = null;
        if (install) {
            if (isThemeLimited) {
                if (!themeRef) {
                    setBlocked(true);
                    return;
                }
                error = checkThemeLimitError(themeRef.split("/")[1]?.toLowerCase());
            }
        } else if (noThemeChangesAllowed) {
            error = checkThemeLimitError();
        }

        if (error) {
            setBlocked(true);
            showLimit({
                prompt: error,
                onOk: () => navigate("/pro", { crossApp: true }),
            });
            navigate("/settings/theme", { replace: true });
        }
    }, [blocked, install, isReady, isThemeLimited, navigate, noThemeChangesAllowed, showLimit, themeRef]);

    if (!isReady || blocked) {
        return null;
    }
    if (!install && noThemeChangesAllowed && checkThemeLimitError()) {
        return null;
    }
    if (install && isThemeLimited && (!themeRef || checkThemeLimitError(themeRef.split("/")[1]?.toLowerCase()))) {
        return null;
    }

    return <ChangeThemeContent installParams={install ? { source, ref: themeRef } : undefined} />;
}
