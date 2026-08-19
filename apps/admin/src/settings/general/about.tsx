import {GhostLogo, Separator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {useSettingsNavigation} from '@/settings/hooks/use-settings-navigation';
import {SettingsModal} from '@tryghost/shade/patterns';
import {linkToGitHubReleases} from '@/settings/utils/link-to-github-releases';
import {showDatabaseWarning} from '@/settings/utils/show-database-warning';
import {useGlobalData} from '@/settings/providers/global-data-context';
import {useUpgradeStatus} from '@/settings/providers/settings-app-context';

const adminBuildVersion = import.meta.env.GHOST_BUILD_VERSION;

function VersionLink({label, version}: {label: string; version: string}) {
    const link = linkToGitHubReleases(version);
    return (
        <div>
            <strong>{label}:</strong> {link
                ? <a className='text-green' href={link} rel="noopener noreferrer" target="_blank">{version}</a>
                : version}
        </div>
    );
}

function AboutModal() {
    const {updateRoute} = useSettingsNavigation();
    const globalData = useGlobalData();
    const config = globalData.config;
    const upgradeStatus = useUpgradeStatus();

    function copyrightYear():number {
        const date = new Date();
        return date.getFullYear();
    }

    function hasDeveloperExperiments():boolean {
        if (config.enableDeveloperExperiments) {
            return true;
        } else {
            return false;
        }
    }

    function showSystemInfo() : boolean {
        const isPro = !!config.hostSettings?.siteId;

        if (isPro) {
            return false;
        }

        return true;
    }

    return (
        <SettingsModal
            cancelLabel=''
            footer={(<></>)}
            topRightContent='close'
            width={540}
            onClose={() => {
                updateRoute('');
            }}
        >
            <div className='flex flex-col gap-4 pb-7'>
                <GhostLogo className="h-auto w-[120px] dark:invert"/>
                <div className='mt-3 flex flex-col gap-1.5'>
                    {
                        upgradeStatus?.message && (
                            <div className='gh-prose-links mb-4 rounded-sm border border-green p-5'>
                                <strong>Update available!</strong>
                                <div dangerouslySetInnerHTML={{__html: upgradeStatus.message}}/>
                            </div>
                        )
                    }
                    {adminBuildVersion ? (
                        <>
                            <VersionLink label="Server" version={config.version} />
                            <VersionLink label="Admin" version={adminBuildVersion} />
                        </>
                    ) : (
                        <VersionLink label="Version" version={config.version} />
                    )}
                    {
                        showSystemInfo() && (
                            <>
                                <div><strong>Environment:</strong> {config.environment}</div>
                                <div><strong>Database:</strong> {config.database}</div>
                                <div><strong>Mail:</strong> {config.mail ? config.mail : 'Native'}</div>
                            </>
                        )
                    }
                    {
                        hasDeveloperExperiments() && (
                            <div><strong>Developer experiments:</strong> Enabled</div>
                        )
                    }

                    {
                        showSystemInfo() && showDatabaseWarning(config.environment, config.database) && (
                            <div className='text-red-500 dark:text-red-400'>
                                 You are running an unsupported database in production. Please <a href="https://ghost.org/docs/faq/supported-databases/" rel="noopener noreferrer" target="_blank">upgrade to MySQL 8</a>.
                            </div>
                        )
                    }
                </div>
                <Separator />
                <div className='flex flex-col gap-1.5'>
                    <a className='flex items-center gap-2 hover:text-grey-900 dark:hover:text-grey-400' href="https://ghost.org/docs/" rel="noopener noreferrer" target="_blank"><LucideIcon.BookOpen className='size-4' /> User documentation</a>
                    <a className='flex items-center gap-2 hover:text-grey-900 dark:hover:text-grey-400' href="https://forum.ghost.org/" rel="noopener noreferrer" target="_blank"><LucideIcon.CircleHelp className='size-4' /> Get help with Ghost</a>
                    <a className='flex items-center gap-2 hover:text-grey-900 dark:hover:text-grey-400' href="https://ghost.org/docs/contributing/" rel="noopener noreferrer" target="_blank"><LucideIcon.Code className='size-4' /> Get involved</a>
                </div>
                <Separator />
                <p className='max-w-[460px] text-sm'>
                    Copyright © 2013 &ndash; {copyrightYear()} Ghost Foundation, released under the <a className='text-green' href="https://github.com/TryGhost/Ghost/blob/main/LICENSE" rel="noopener noreferrer" target="_blank">MIT license</a>. <a className='text-green' href="https://ghost.org/" rel="noopener noreferrer" target="_blank">Ghost</a> is a registered trademark of <a className='text-green' href="https://ghost.org/trademark/" rel="noopener noreferrer" target="_blank">Ghost Foundation Ltd</a>.
                </p>
            </div>
        </SettingsModal>
    );
}

export default AboutModal;
