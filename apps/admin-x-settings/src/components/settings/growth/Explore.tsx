import FakeLogo from '../../../assets/images/portal-splash-default-logo.png';
import React, {useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Icon, Separator, SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const Explore: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings} = useGlobalData();
    const [accentColor, icon] = getSettingValues<string>(settings, ['accent_color', 'icon']);
    const [shareGrowthData, setShareGrowthData] = useState(false);
    const [exploreEnabled, setExploreEnabled] = useState(true);
    const {localSettings, siteData} = useSettingGroup();
    const [title, description] = getSettingValues(localSettings, ['title', 'description']) as string[];

    const enableToggle = (
        <>
            <Toggle
                checked={exploreEnabled}
                direction='rtl'
                onChange={() => {
                    setExploreEnabled(!exploreEnabled);
                }}
            />
        </>
    );

    const url = siteData?.url;
    const siteDomain = url?.replace(/^https?:\/\//, '').replace(/\/?$/, '');

    const color = accentColor || '#F6414E';

    return (<TopLevelGroup
        customButtons={enableToggle}
        description='Join the Ghost Explore directory and help new readers find your site.'
        keywords={keywords}
        navid='explore'
        testId='explore'
        title='Ghost Explore'
    >
        {exploreEnabled &&
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
                    onChange={() => {
                        setShareGrowthData(!shareGrowthData);
                    }}
                />
                <div className='-mx-7 -mb-7 flex flex-col items-center bg-grey-75 px-7 pb-10 pt-8'>
                    <div className='relative w-full max-w-[320px] rounded-lg bg-white p-6 shadow-lg'>
                        <div className='absolute right-3 top-2.5 text-xs uppercase text-grey-300 dark:text-grey-900'>Preview</div>
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
        }
    </TopLevelGroup>);
};

export default withErrorBoundary(Explore, 'Ghost Explore');
