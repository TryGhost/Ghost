import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import validator from 'validator';
import {Icon, SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useLimiter} from '../../../hooks/useLimiter';

const Network: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();
    const limiter = useLimiter();

    // The Network toggle is disabled in Admin settings if:
    // 1. (Ghost (Pro) only) the feature is disabled by config
    // 2. The site is hosted on a subdirectory, localhost or an IP address in production
    const [isDisabledByConfig, setIsDisabledByConfig] = useState(false);
    useEffect(() => {
        async function checkLimiter() {
            if (limiter?.isLimited('limitSocialWeb') && await limiter.checkWouldGoOverLimit('limitSocialWeb')) {
                setIsDisabledByConfig(true);
            }
        }

        checkLimiter();
    }, [limiter]);

    const {subdir} = getGhostPaths();
    const isProduction = process.env.NODE_ENV === 'production';
    const isHostedOnSubdirectory = isProduction && !!subdir;
    const isHostedOnLocalhost = isProduction && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const isHostedOnIP = isProduction && validator.isIP(window.location.hostname);

    const isDisabled = isDisabledByConfig || isHostedOnSubdirectory || isHostedOnLocalhost || isHostedOnIP;

    // The Network toggle is displayed as checked if:
    // 1. The setting value is true, and
    // 2. The toggle is not disabled
    const [socialWebSetting] = getSettingValues<boolean>(settings, ['social_web']);
    const isChecked = !!socialWebSetting && !isDisabled;

    // Handle toggle change
    const toggleSocialWebSetting = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const updatedSetting: Setting[] = [
            {key: 'social_web', value: event.target.checked}
        ];

        try {
            await editSettings(updatedSetting);
        } catch (error) {
            handleError(error);
        }
    };

    return (<TopLevelGroup
        customButtons={
            <Toggle
                checked={isChecked}
                direction='rtl'
                disabled={isDisabled}
                onChange={toggleSocialWebSetting}
            />
        }
        description='Make your content visible to millions across Flipboard, Mastodon, Threads, Bluesky, and WordPress.'
        keywords={keywords}
        navid='network'
        testId='network'
        title='Network'
    >
        <SettingGroupContent
            columns={1}
            values={[
                {
                    key: 'private',
                    value:
                        isDisabled &&
                            <div className='flex w-full gap-1.5 rounded-md border border-grey-200 bg-grey-75 p-3 text-sm'>
                                <Icon name='info' size={16} />
                                <div className='-mt-0.5'>
                                    Network is disabled because your domain isn’t configured correctly. <a className='text-green' href="https://ghost.org/docs" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a>
                                </div>
                            </div>
                }
            ]}
        />
    </TopLevelGroup>);
};

export default withErrorBoundary(Network, 'Network');
