import FakeLogo from '../../../assets/images/explore-default-logo.png';
import React, {useEffect, useState} from 'react';
import SettingImg from '../../../assets/images/ghost-explore.png';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Button} from '@tryghost/shade/components';
import {Field, FieldContent, FieldDescription, FieldLabel, Separator, Switch} from '@tryghost/shade/components';
import {LucideIcon, abbreviateNumber} from '@tryghost/shade/utils';
import {type Setting, getSettingValue, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

const Explore: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();
    const {updateRoute} = useRouting();

    // Get members count
    const {refetch: fetchMembers} = useBrowseMembers({
        searchParams: {limit: '1'}
    });
    const [membersCount, setMembersCount] = useState(0);
    useEffect(() => {
        const fetchMemberCount = async () => {
            const {data: members} = await fetchMembers();
            const count = members?.meta?.pagination?.total || 0;
            setMembersCount(count);
        };

        fetchMemberCount();
    }, [fetchMembers]);

    const [accentColor, icon] = getSettingValues<string>(settings, ['accent_color', 'icon']);
    const {localSettings, siteData} = useSettingGroup();
    const [title, description] = getSettingValues(localSettings, ['title', 'description']) as string[];
    const exploreEnabled = Boolean(getSettingValue<boolean>(settings, 'explore_ping'));
    const shareGrowthData = Boolean(getSettingValue<boolean>(settings, 'explore_ping_growth'));

    const url = siteData?.url;
    const siteDomain = url?.replace(/^https?:\/\//, '').replace(/\/?$/, '');

    const color = accentColor || '#F6414E';

    // Handle toggle change
    const toggleSetting = async (key: string, checked: boolean) => {
        const updatedSetting: Setting[] = [
            {key, value: checked}
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
                aria-label='Ghost Explore'
                checked={exploreEnabled}
                data-testid='explore-toggle'
                onCheckedChange={checked => toggleSetting('explore_ping', checked)}
            />
        }
        description={`Promote your site across Ghost's website and publishing network`}
        keywords={keywords}
        navid='explore'
        testId='explore'
        title='Ghost Explore'
    >
        {exploreEnabled ?
            <SettingGroupContent columns={1}>
                <Separator />
                <Field orientation='horizontal'>
                    <FieldContent>
                        <FieldLabel htmlFor='explore-growth-toggle'>Share growth data to rank higher?</FieldLabel>
                        <FieldDescription>Enabling this will use your revenue/member growth data to rank your site more highly on Ghost Explore. Total member count will be displayed publicly, other data will be kept private.</FieldDescription>
                    </FieldContent>
                    <Switch
                        checked={Boolean(shareGrowthData)}
                        data-testid='explore-growth-toggle'
                        id='explore-growth-toggle'
                        onCheckedChange={checked => toggleSetting('explore_ping_growth', checked)}
                    />
                </Field>
                <div className='-mx-5 -mb-5 flex flex-col items-center bg-grey-50 px-7 py-10 md:-mx-7 md:-mb-7' data-testid='explore-preview'>
                    <div className='relative w-full max-w-[320px] rounded-lg bg-white p-6 text-black shadow-lg'>
                        <div className='absolute top-2.5 right-3 text-sm text-grey-300 uppercase'>Preview</div>
                        {icon ?
                            <div className='size-9 rounded-sm bg-cover bg-center' style={{
                                backgroundImage: `url(${icon})`
                            }} />
                            :
                            <div className='flex aspect-square size-10 items-center justify-center overflow-hidden rounded-full p-1 text-white' style={{
                                backgroundColor: color
                            }}>
                                <img className='h-auto w-8' src={FakeLogo} />
                            </div>
                        }
                        <div className='mt-3 text-lg font-semibold tracking-tight'>{title}</div>
                        {description &&
                            <div className='mt-0.5 leading-tight text-grey-700'>{description}</div>
                        }
                        <a className='group mt-8 flex h-6 w-full items-center justify-between gap-5 hover:cursor-pointer' href={url} rel="noopener noreferrer" target="_blank">
                            <span className='font-semibold'>{siteDomain}</span>
                            {shareGrowthData ?
                                <span className='rounded-sm bg-black px-2 py-0.5 text-sm font-semibold text-white' data-testid='explore-members-count'>
                                    {abbreviateNumber(membersCount)}&nbsp;{membersCount === 1 ? 'member' : 'members'}
                                </span>
                                :
                                <span className='flex size-5 items-center justify-center rounded-full border border-black text-black group-hover:bg-black group-hover:text-white'>
                                    <LucideIcon.ArrowRight className='size-2.5' />
                                </span>
                            }
                        </a>
                    </div>
                </div>
                <div className='-mx-5 -mb-5 flex items-center justify-between gap-4 rounded-b-xl border-t border-[rgba(142,66,255,0.1)] bg-gradient-to-tr from-[rgba(142,66,255,0.07)] to-[rgba(142,66,255,0.02)] p-6 px-7 md:-mx-7 md:-mb-7'>
                    <div className='flex flex-col'>
                        <span className='font-medium'>Get featured on the Ghost.org homepage</span>
                        <span className='text-pretty text-black/80 dark:text-white/80'>Send us a quote we can use to highlight your site</span>
                    </div>
                    <Button className='border border-purple bg-transparent text-purple hover:bg-purple/5 hover:text-purple' type='button' variant='outline' onClick={() => {
                        updateRoute('explore/testimonial');
                    }}>
                        <LucideIcon.Send />
                        Send testimonial
                    </Button>
                </div>
            </SettingGroupContent>
            :
            <img src={SettingImg} />
        }
    </TopLevelGroup>);
};

export default withErrorBoundary(Explore, 'Ghost Explore');
