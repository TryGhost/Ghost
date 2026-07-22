import { type ReactNode, useState } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@tryghost/shade/components";
import { type InstalledTheme, useActiveTheme, useActivateTheme } from "@tryghost/admin-x-framework/api/themes";
import { getHomepageUrl, useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import {
    ErrorTextCard,
    type FatalErrors,
    OutcomeBanner,
    ThemeValidationDetailsDisclosure,
    ValidationProblemCard,
    getIssuesFromFatalErrors,
    getIssuesFromInstalledTheme,
} from "@tryghost/admin-x-settings/src/components/settings/site/theme/theme-validation-details";

import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";

export type { FatalErrors };

/**
 * The theme upload/install outcome dialogs, ported from the legacy
 * theme-installed-modal.tsx and invalid-theme-modal.tsx onto Shade Dialogs.
 * Both keep the legacy `confirmation-modal` testid — they are shown from the
 * change-theme flows, the installed list and the code editor, always one at
 * a time.
 */

export interface ThemeInstalledState {
    title: string;
    prompt: ReactNode;
    installedTheme: InstalledTheme;
    onActivate?: () => void;
}

export function ThemeInstalledDialog({ state, onClose }: { state: ThemeInstalledState; onClose: () => void }) {
    const { title, installedTheme, onActivate } = state;
    const { mutateAsync: activateTheme } = useActivateTheme();
    const activeThemeQuery = useActiveTheme();
    const handleError = useSettingsHandleError();
    const { data: configData } = useBrowseConfig();
    const { data: siteData } = useBrowseSite();
    const [isActivating, setActivating] = useState(false);
    const defaultOpen = configData?.config?.environment === "development";
    const secondaryProblems = getIssuesFromInstalledTheme(installedTheme);
    const homepageUrl = siteData?.site ? getHomepageUrl(siteData.site) : undefined;

    const okLabel = installedTheme.active ? "OK" : "Activate theme";
    const modalTitle = installedTheme.active ? <span className="text-green">It&apos;s live!</span> : title;
    const outcomeCopy = installedTheme.active ? (
        <>
            Your theme <strong>{installedTheme.name}</strong> was saved successfully and is now visible to your readers.
            {homepageUrl ? (
                <>
                    {" "}<a className="font-semibold text-foreground hover:underline" href={homepageUrl} rel="noreferrer" target="_blank">Take a look →</a>
                </>
            ) : null}
        </>
    ) : (
        <>
            <strong>{installedTheme.name}</strong> has been uploaded. Activate it to make it live.
        </>
    );

    const handleOk = async () => {
        if (!installedTheme.active) {
            setActivating(true);
            try {
                const resData = await activateTheme(installedTheme.name);
                const updatedTheme = resData.themes[0];
                void activeThemeQuery.refetch();

                showToast({
                    type: "success",
                    title: "Theme activated",
                    message: <div><span className="capitalize">{updatedTheme.name}</span> is now your active theme.</div>,
                });
            } catch (e) {
                handleError(e);
            } finally {
                setActivating(false);
            }
        }
        onActivate?.();
        onClose();
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent aria-describedby={undefined} className="max-h-[85vh] overflow-y-auto" data-testid="confirmation-modal">
                <DialogHeader>
                    <DialogTitle>{modalTitle}</DialogTitle>
                </DialogHeader>
                <div className="space-y-5">
                    {installedTheme.active ? (
                        <div className="space-y-2 text-sm text-foreground">
                            <p>{outcomeCopy}</p>
                        </div>
                    ) : (
                        <OutcomeBanner title="Uploaded successfully" variant="success">
                            <div className="space-y-2">
                                <p>{outcomeCopy}</p>
                            </div>
                        </OutcomeBanner>
                    )}

                    <ThemeValidationDetailsDisclosure
                        defaultOpen={defaultOpen}
                        problems={secondaryProblems}
                    />
                </div>
                <DialogFooter>
                    <Button disabled={isActivating} variant="outline" onClick={onClose}>Close</Button>
                    <Button disabled={isActivating} variant="default" onClick={() => void handleOk()}>
                        {isActivating ? "Activating..." : okLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export interface InvalidThemeState {
    title: string;
    prompt?: ReactNode;
    fatalErrors?: FatalErrors;
    onRetry?: () => void;
}

export function InvalidThemeDialog({ state, onClose }: { state: InvalidThemeState; onClose: () => void }) {
    const { title, prompt, fatalErrors, onRetry } = state;
    const { data: configData } = useBrowseConfig();
    const defaultOpen = configData?.config?.environment === "development";
    const { blockingProblems, secondaryProblems, stringErrors } = getIssuesFromFatalErrors(fatalErrors);
    const blockingIssueCount = blockingProblems.length + stringErrors.length;
    const promptText = prompt ?? <>Ghost found {blockingIssueCount === 1 ? "a blocking validation error" : `${blockingIssueCount} blocking validation errors`} and did not save your theme. Fix {blockingIssueCount === 1 ? "the issue" : "the issues"} below and try again.</>;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent aria-describedby={undefined} className="max-h-[85vh] overflow-y-auto" data-testid="confirmation-modal">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-5">
                    <div className="text-sm text-foreground">{promptText}</div>

                    {(blockingProblems.length > 0 || stringErrors.length > 0) && (
                        <div className="space-y-3">
                            {blockingProblems.map((problem) => (
                                <ValidationProblemCard key={problem.code} problem={problem} prominent />
                            ))}
                            {stringErrors.map((error) => <ErrorTextCard key={error} message={error} />)}
                        </div>
                    )}

                    <ThemeValidationDetailsDisclosure
                        defaultOpen={defaultOpen}
                        problems={secondaryProblems}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    {onRetry && (
                        <Button variant="default" onClick={() => {
                            onClose();
                            onRetry();
                        }}>Retry</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
