import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useFeatureFlag from '../../../hooks/useFeatureFlag';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Button, Separator, SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues, isSettingReadOnly} from '@tryghost/admin-x-framework/api/settings';
import {usePostsExports} from '@tryghost/admin-x-framework/api/posts';

const Analytics: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [trackEmailOpens, trackEmailClicks, trackMemberSources, outboundLinkTagging, isWebAnalyticsEnabled, isWebAnalyticsConfigured] = getSettingValues(localSettings, [
        'email_track_opens', 'email_track_clicks', 'members_track_sources', 'outbound_link_tagging', 'web_analytics_enabled', 'web_analytics_configured'
    ]) as boolean[];

    const taBetaFlagEnabled = useFeatureFlag('trafficAnalytics');
    const ui60 = useFeatureFlag('ui60');
    const isEmailTrackClicksReadOnly = isSettingReadOnly(localSettings, 'email_track_clicks');

    const handleToggleChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting(key, e.target.checked);
        handleEditingChange(true);
    };

    const {refetch: postsData} = usePostsExports({
        searchParams: {
            limit: '1000'
        },
        enabled: false
    });

    const exportPosts = async () => {
        const {data} = await postsData();
        if (data) {
            const blob = new Blob([data], {type: 'text/csv'});
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', `post-analytics.${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const inputs = (
        <SettingGroupContent className="analytics-settings !gap-y-0" columns={1}>
            {taBetaFlagEnabled && (
                <>
                    <Toggle
                        checked={isWebAnalyticsEnabled}
                        direction='rtl'
                        disabled={!isWebAnalyticsConfigured}
                        gap='gap-0'
                        hint={ui60 && 'Cookie-free, first party traffic analytics for your site'}
                        label='Web analytics'
                        labelClasses='py-4 w-full'
                        onChange={(e) => {
                            handleToggleChange('web_analytics', e);
                        }}
                    />
                    {ui60 && !isWebAnalyticsConfigured ?
                        <div className='mb-5 rounded-md border border-grey-200 bg-grey-50 px-4 py-2.5'>
                            <span className='flex items-start gap-2'>
                                {/* <Icon className='-mt-px text-black' name='info-fill' size={24} /> */}
                                <span>
                            Web analytics in Ghost is powered by <a className='text-green underline' href="https://tinybird.co" rel="noopener noreferrer" target='_blank'>Tinybird</a> and requires configuration to start collecting data. <a className='text-green underline' href="https://ghost.org/docs/" rel="noopener noreferrer" target='_blank'>Get started &rarr;</a>
                                </span>
                            </span>
                        </div>
                        :
                        <Separator className="border-grey-200 dark:border-grey-900" />
                    }
                </>
            )}
            <Toggle
                checked={trackEmailOpens}
                direction='rtl'
                gap='gap-0'
                hint={ui60 && 'Record when a member opens an email'}
                label='Newsletter opens'
                labelClasses='py-4 w-full'
                onChange={(e) => {
                    handleToggleChange('email_track_opens', e);
                }}
            />
            <Separator className="border-grey-200 dark:border-grey-900" />
            <Toggle
                checked={trackEmailClicks}
                direction='rtl'
                disabled={isEmailTrackClicksReadOnly}
                gap='gap-0'
                hint={ui60 && 'Record when a member clicks on any link in an email'}
                label='Newsletter clicks'
                labelClasses='py-4 w-full'
                onChange={(e) => {
                    handleToggleChange('email_track_clicks', e);
                }}
            />
            <Separator className="border-grey-200 dark:border-grey-900" />
            <Toggle
                checked={trackMemberSources}
                direction='rtl'
                gap='gap-0'
                hint={ui60 && 'Track the traffic sources and posts that drive the most member growth'}
                label='Member sources'
                labelClasses='py-4 w-full'
                onChange={(e) => {
                    handleToggleChange('members_track_sources', e);
                }}
            />
            <Separator className="border-grey-200 dark:border-grey-900" />
            <Toggle
                checked={outboundLinkTagging}
                direction='rtl'
                gap='gap-0'
                hint={ui60 && 'Make it easier for other sites to track the traffic you send them in their analytics'}
                label='Outbound link tagging'
                labelClasses='py-4 w-full'
                onChange={(e) => {
                    handleToggleChange('outbound_link_tagging', e);
                }}
            />
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='Decide what data you collect across your publication'
            isEditing={isEditing}
            keywords={keywords}
            navid='analytics'
            saveState={saveState}
            testId='analytics'
            title='Analytics'
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {inputs}
            <div className='items-center-mt-1 flex justify-between'>
                {!ui60 && <Button color='green' label='Export' link linkWithPadding onClick={exportPosts} />}
                <a className='text-sm text-green' href="https://ghost.org/help/post-analytics/" rel="noopener noreferrer" target="_blank">Learn about analytics</a>
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Analytics, 'Analytics');
