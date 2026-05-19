import NiceModal from '@ebay/nice-modal-react';
import {GhostLogo, Icon, Modal, Separator} from '@tryghost/admin-x-design-system';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {linkToGitHubReleases} from '../../../utils/link-to-github-releases';
import {showDatabaseWarning} from '../../../utils/show-database-warning';
import {useGlobalData} from '../../providers/global-data-provider';
import {useUpgradeStatus} from '../../providers/settings-app-provider';

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

const AboutModal = NiceModal.create<RoutingModalProps>(({}) => {
    const {updateRoute} = useRouting();
    const globalData = useGlobalData();
    let config = globalData.config;
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
        <Modal
            afterClose={() => {
                updateRoute('');
            }}
            cancelLabel=''
            footer={(<></>)}
            topRightContent='close'
            width={540}
        >
            <div className='flex flex-col gap-4 pb-7 text-sm'>
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
                    <a className='flex items-center gap-2 hover:text-grey-900 dark:hover:text-grey-400' href="https://ghost.org/docs/" rel="noopener noreferrer" target="_blank"><Icon name='book-open' size='sm' /> User documentation</a>
                    <a className='flex items-center gap-2 hover:text-grey-900 dark:hover:text-grey-400' href="https://forum.ghost.org/" rel="noopener noreferrer" target="_blank"><Icon name='question-circle' size='sm' /> Get help with Ghost</a>
                    <a className='flex items-center gap-2 hover:text-grey-900 dark:hover:text-grey-400' href="https://ghost.org/docs/contributing/" rel="noopener noreferrer" target="_blank"><Icon name='angle-brackets' size='sm' /> Get involved</a>
                </div>
                <Separator />
                <p className='max-w-[460px] text-xs'>
                    Copyright © 2013 &ndash; {copyrightYear()} Ghost Foundation, released under the <a className='text-green' href="https://github.com/TryGhost/Ghost/blob/main/LICENSE" rel="noopener noreferrer" target="_blank">MIT license</a>. <a className='text-green' href="https://ghost.org/" rel="noopener noreferrer" target="_blank">Ghost</a> is a registered trademark of <a className='text-green' href="https://ghost.org/trademark/" rel="noopener noreferrer" target="_blank">Ghost Foundation Ltd</a>.
                </p>
            </div>
        </Modal>
    );
});

export default AboutModal;
