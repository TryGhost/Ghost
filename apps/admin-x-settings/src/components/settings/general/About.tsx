import Icon from '../../../admin-x-ds/global/Icon';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import Separator from '../../../admin-x-ds/global/Separator';
import semverParse from 'semver/functions/parse';
import useRouting from '../../../hooks/useRouting';
import {ReactComponent as GhostLogo} from '../../../admin-x-ds/assets/images/ghost-logo.svg';
import {RoutingModalProps} from '../../providers/RoutingProvider';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useUpgradeStatus} from '../../providers/ServiceProvider';

const AboutModal = NiceModal.create<RoutingModalProps>(({}) => {
    const {updateRoute} = useRouting();
    const globalData = useGlobalData();
    let config = globalData.config;
    const upgradeStatus = useUpgradeStatus();

    function linkToGitHubReleases():string {
        if (config.version.includes('-pre.')) {
            try {
                const semverVersion = semverParse(config.version, {includePrerelease: true} as any);

                if (semverVersion && semverVersion.build?.[0]) {
                    return `https://github.com/TryGhost/Ghost/commit/${semverVersion.build[0]}`;
                }

                return '';
            } catch (e) {
                return '';
            }
        }

        return `https://github.com/TryGhost/Ghost/releases/tag/v${config.version}`;
    }

    function copyrightYear():number {
        const date = new Date();
        return date.getFullYear();
    }

    function hasDeveloperExperiments():string {
        if (config.enableDeveloperExperiments) {
            return 'Enabled';
        }
        return 'Disabled';
    }

    function showSystemInfo() : boolean {
        const isPro = !!config.hostSettings?.siteId;

        if (isPro) {
            return false;
        }

        return true;
    }

    function showDatabaseWarning() : boolean {
        const isProduction = !!config.environment.match?.(/production/i);
        const database = config.database;

        // Show a warning if we're in production and not using MySQL 8
        if (isProduction && database !== 'mysql8') {
            return true;
        }

        // Show a warning if we're in development and using MySQL 5
        if (!isProduction && database === 'mysql5') {
            return true;
        }

        return false;
    }

    return (
        <Modal
            afterClose={() => {
                updateRoute('');
            }}
            cancelLabel=''
            footer={(<></>)}
            size={540}
            topRightContent='close'
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
                    {
                        linkToGitHubReleases() && (
                            <div><strong>Version:</strong> <a className='text-green' href={linkToGitHubReleases()} rel="noopener noreferrer" target="_blank">{config.version}</a></div>
                        ) || (
                            <div><strong>Version:</strong> {config.version}</div>
                        )
                    }
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
                            <div><strong>Developer experiments:</strong> {hasDeveloperExperiments()}</div>
                        )
                    }

                    {
                        showSystemInfo() && showDatabaseWarning() && (
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
