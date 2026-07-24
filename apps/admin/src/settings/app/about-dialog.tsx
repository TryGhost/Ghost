import { Dialog, DialogContent, DialogHeader, DialogTitle, GhostLogo, Separator } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { useNavigate } from "@tryghost/admin-x-framework";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { linkToGitHubReleases } from "@tryghost/admin-x-settings/src/utils/link-to-github-releases";
import { showDatabaseWarning } from "@tryghost/admin-x-settings/src/utils/show-database-warning";

/**
 * The About Ghost dialog (`/settings/about`), ported from the legacy
 * general/about.tsx: version links to GitHub, system info for self-hosters,
 * doc links and the license line. The legacy upgrade-status banner is not
 * ported — the React admin never provides an upgradeStatus, so it never
 * rendered in either lane. The logo keeps the legacy `dark:invert` (a
 * fixed-black wordmark image; no semantic token can flip it).
 */

const adminBuildVersion = import.meta.env.GHOST_BUILD_VERSION as string | undefined;

function VersionLink({ label, version }: { label: string; version: string }) {
    const link = linkToGitHubReleases(version);
    return (
        <div>
            <strong>{label}:</strong>{" "}
            {link
                ? <a className="text-green" href={link} rel="noopener noreferrer" target="_blank">{version}</a>
                : version}
        </div>
    );
}

export function AboutDialog() {
    const navigate = useNavigate();
    const { data: configData } = useBrowseConfig();
    const config = configData?.config;

    const close = () => navigate("/settings");

    if (!config) {
        return null;
    }

    const isPro = Boolean(config.hostSettings?.siteId);
    const showSystemInfo = !isPro;
    const copyrightYear = new Date().getFullYear();

    return (
        <Dialog open onOpenChange={(open) => !open && close()}>
            <DialogContent className="max-h-[85vh] max-w-[540px] overflow-y-auto" data-testid="about-modal">
                <DialogHeader className="sr-only">
                    <DialogTitle>About Ghost</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 pt-2">
                    <GhostLogo className="h-auto w-[120px] dark:invert" />
                    <div className="mt-3 flex flex-col gap-1.5">
                        {adminBuildVersion ? (
                            <>
                                <VersionLink label="Server" version={String(config.version)} />
                                <VersionLink label="Admin" version={adminBuildVersion} />
                            </>
                        ) : (
                            <VersionLink label="Version" version={String(config.version)} />
                        )}
                        {showSystemInfo && (
                            <>
                                <div><strong>Environment:</strong> {String(config.environment)}</div>
                                <div><strong>Database:</strong> {String(config.database)}</div>
                                <div><strong>Mail:</strong> {config.mail ? String(config.mail) : "Native"}</div>
                            </>
                        )}
                        {Boolean(config.enableDeveloperExperiments) && (
                            <div><strong>Developer experiments:</strong> Enabled</div>
                        )}
                        {showSystemInfo && showDatabaseWarning(String(config.environment), String(config.database)) && (
                            <div className="text-destructive">
                                You are running an unsupported database in production. Please <a className="underline" href="https://ghost.org/docs/faq/supported-databases/" rel="noopener noreferrer" target="_blank">upgrade to MySQL 8</a>.
                            </div>
                        )}
                    </div>
                    <Separator />
                    <div className="flex flex-col gap-1.5">
                        <a className="flex items-center gap-2 hover:text-muted-foreground" href="https://ghost.org/docs/" rel="noopener noreferrer" target="_blank"><LucideIcon.BookOpen className="size-4" /> User documentation</a>
                        <a className="flex items-center gap-2 hover:text-muted-foreground" href="https://forum.ghost.org/" rel="noopener noreferrer" target="_blank"><LucideIcon.CircleHelp className="size-4" /> Get help with Ghost</a>
                        <a className="flex items-center gap-2 hover:text-muted-foreground" href="https://ghost.org/docs/contributing/" rel="noopener noreferrer" target="_blank"><LucideIcon.CodeXml className="size-4" /> Get involved</a>
                    </div>
                    <Separator />
                    <p className="max-w-[460px] text-sm">
                        Copyright &copy; 2013 &ndash; {copyrightYear} Ghost Foundation, released under the <a className="text-green" href="https://github.com/TryGhost/Ghost/blob/main/LICENSE" rel="noopener noreferrer" target="_blank">MIT license</a>. <a className="text-green" href="https://ghost.org/" rel="noopener noreferrer" target="_blank">Ghost</a> is a registered trademark of <a className="text-green" href="https://ghost.org/trademark/" rel="noopener noreferrer" target="_blank">Ghost Foundation Ltd</a>.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
