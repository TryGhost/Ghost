import FakeLogo from '../../../assets/images/portal-splash-default-logo.png';
import React from 'react';
import SettingImg from '../../../assets/images/ghost-explore.png';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Icon, Separator, SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const Explore: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const [accentColor, icon] = getSettingValues<string>(settings, ['accent_color', 'icon']);
    const {localSettings, siteData} = useSettingGroup();
    const [title, description] = getSettingValues(localSettings, ['title', 'description']) as string[];
    const [exploreEnabled] = getSettingValues<boolean>(settings, ['explore_ping']);
    const [shareGrowthData] = getSettingValues<boolean>(settings, ['explore_ping_growth']);

    const url = siteData?.url;
    const siteDomain = url?.replace(/^https?:\/\//, '').replace(/\/?$/, '');

    const color = accentColor || '#F6414E';

    // Handle toggle change
    const toggleSetting = async (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const updatedSetting: Setting[] = [
            {key, value: event.target.checked}
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
                checked={exploreEnabled}
                direction='rtl'
                testId='explore-toggle'
                onChange={event => toggleSetting('explore_ping', event)}
            />
        }
        description='Join the Ghost Explore directory and help new readers find your site.'
        keywords={keywords}
        navid='explore'
        testId='explore'
        title='Ghost Explore'
    >
        {exploreEnabled ?
            <SettingGroupContent columns={1}>
                <Separator />
                <Toggle
                    checked={shareGrowthData}
                    containerClasses='!items-center'
                    direction='rtl'
                    gap='gap-0'
                    hint={'Make your member count and revenue public to improve your ranking on Explore'}
                    label='Share growth data'
                    labelClasses='w-full'
                    testId='explore-growth-toggle'
                    onChange={event => toggleSetting('explore_ping_growth', event)}
                />
                <div className='-mx-5 -mb-5 flex flex-col items-center rounded-b-xl bg-grey-75 px-7 py-10 md:-mx-7 md:-mb-7' data-testid='explore-preview'>
                    <div className='relative w-full max-w-[320px] rounded-lg bg-white p-6 text-black shadow-lg'>
                        <div className='absolute right-3 top-2.5 text-xs uppercase text-grey-300'>Preview</div>
                        {icon ?
                            <div className='size-9 rounded-sm bg-cover bg-center' style={{
                                backgroundImage: `url(${icon})`
                            }} />
                            :
                            <div className='flex aspect-square items-center justify-center overflow-hidden rounded-full p-1 text-white' style={{
                                backgroundColor: color
                            }}>
                                <img className='h-auto w-5' src={FakeLogo} />
                            </div>
                        }
                        <div className='mt-3 text-lg font-semibold tracking-tight'>{title}</div>
                        {description &&
                            <div className='mt-1.5 text-sm leading-tight text-grey-700'>{description}</div>
                        }
                        <a className='group mt-8 flex h-6 w-full items-center justify-between gap-5 hover:cursor-pointer' href={url} rel="noopener noreferrer" target="_blank">
                            <span className='text-sm font-semibold'>{siteDomain}</span>
                            {shareGrowthData ?
                                <span className='rounded-sm bg-black px-2 py-0.5 text-xs font-semibold text-white'>
                                    12k members
                                </span>
                                :
                                <span className='flex size-5 items-center justify-center rounded-full border border-black text-black group-hover:bg-black group-hover:text-white'>
                                    <Icon name='arrow-right' size={10} />
                                </span>
                            }
                        </a>
                    </div>
                </div>
            </SettingGroupContent>
            :
            <img src={SettingImg} />
        }
    </TopLevelGroup>);
};

export default withErrorBoundary(Explore, 'Ghost Explore');
