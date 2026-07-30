import React from 'react';
import SettingImg from '../../../assets/images/network.png';
import TopLevelGroup from '../../top-level-group';
import validator from 'validator';
import {LucideIcon} from '@tryghost/shade/utils';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {Switch} from '@tryghost/shade/components';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useLimiter} from '../../../hooks/use-limiter';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

const Network: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();
    const {updateRoute} = useRouting();

    // The Network toggle is disabled in Admin settings if:
    // 1. (Ghost (Pro) only) the feature is disabled by config
    // 2. The site is hosted on a subdirectory, localhost or an IP address in production
    // 3. The site is in private mode
    const limiter = useLimiter();
    const isDisabledByConfig = limiter?.isDisabled('limitSocialWeb');

    const {subdir} = getGhostPaths();
    const isProduction = process.env.NODE_ENV === 'production';
    const [isPrivate] = getSettingValues<boolean>(settings, ['is_private']);
    const isHostedOnSubdirectory = isProduction && !!subdir;
    const isHostedOnLocalhost = isProduction && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const isHostedOnIP = isProduction && validator.isIP(window.location.hostname);

    const isDisabledByHosting = isDisabledByConfig || isHostedOnSubdirectory || isHostedOnLocalhost || isHostedOnIP;
    const isDisabledByPrivateMode = !!isPrivate;
    const isDisabled = isDisabledByHosting || isDisabledByPrivateMode;

    // The Network toggle is displayed as checked if:
    // 1. The setting value is true, and
    // 2. The toggle is not disabled
    const [socialWebSetting] = getSettingValues<boolean>(settings, ['social_web']);
    const isChecked = !!socialWebSetting && !isDisabled;

    // Handle toggle change
    const toggleSocialWebSetting = async (checked: boolean) => {
        const updatedSetting: Setting[] = [
            {key: 'social_web', value: checked}
        ];

        try {
            await editSettings(updatedSetting);
        } catch (error) {
            handleError(error);
        }
    };

    return (<TopLevelGroup
        customButtons={
            <Switch
                aria-label='Network'
                checked={isChecked}
                disabled={isDisabled}
                onCheckedChange={toggleSocialWebSetting}
            />
        }
        description='Distribute posts to the social web, so people can discover and follow your content across BlueSky, Threads, Mastodon, Flipboard, WordPress, and more.'
        keywords={keywords}
        navid='network'
        testId='network'
        title='Network'
    >
        <>
            <SettingGroupContent
                columns={1}
            >
                {isDisabled &&
                    <div className='flex w-full gap-1.5 rounded-md border border-border-default bg-muted p-3'>
                        <LucideIcon.Info className='size-4' />
                        <div className='-mt-0.5'>
                            {isDisabledByPrivateMode
                                ? <>Network is automatically disabled while your site is in <span className='cursor-pointer text-green' onClick={() => updateRoute('members')}>private mode</span></>
                                : <>You need to configure a supported custom domain to use this feature. <a className='text-green' href="https://ghost.org/help/social-web/#custom-domain-required" rel="noopener noreferrer" target="_blank">Help &rarr;</a></>
                            }
                        </div>
                    </div>
                }
            </SettingGroupContent>
            <div className='-mx-5 -mb-5 overflow-hidden rounded-b-xl md:-mx-7 md:-mb-7'>
                <img className='dark:opacity-90' src={SettingImg} />
            </div>
        </>
    </TopLevelGroup>);
};

export default withErrorBoundary(Network, 'Network');
