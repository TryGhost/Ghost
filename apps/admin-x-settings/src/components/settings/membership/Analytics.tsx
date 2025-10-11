import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {HostLimitError, useLimiter} from '../../../hooks/useLimiter';
import {Separator, SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues, isSettingReadOnly} from '@tryghost/admin-x-framework/api/settings';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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

    const [trackEmailOpens, trackEmailClicks, trackMemberSources, outboundLinkTagging, isWebAnalyticsConfigured, isWebAnalyticsEnabled] = getSettingValues(localSettings, [
        'email_track_opens', 'email_track_clicks', 'members_track_sources', 'outbound_link_tagging', 'web_analytics_configured', 'web_analytics_enabled'
    ]) as boolean[];
    const isEmailTrackClicksReadOnly = isSettingReadOnly(localSettings, 'email_track_clicks');

    const [isWebAnalyticsLimited, setIsWebAnalyticsLimited] = useState(false);
    const limiter = useLimiter();
    const {updateRoute} = useRouting();

    useEffect(() => {
        if (limiter?.isLimited('limitAnalytics')) {
            limiter.errorIfWouldGoOverLimit('limitAnalytics').catch((error) => {
                if (error instanceof HostLimitError) {
                    setIsWebAnalyticsLimited(true);
                }
            });
        } else {
            setIsWebAnalyticsLimited(false);
        }
    }, [limiter]);

    const handleToggleChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting(key, e.target.checked);
        handleEditingChange(true);
    };

    const inputs = (
        <SettingGroupContent className="analytics-settings !gap-y-0" columns={1}>
            <Toggle
                checked={isWebAnalyticsEnabled}
                direction='rtl'
                disabled={!isWebAnalyticsConfigured || isWebAnalyticsLimited}
                gap='gap-0'
                hint={
                    !isWebAnalyticsConfigured ?
                        <>
                            Cookie-free, first party traffic analytics for your site
                        </>
                        :
                        <>
                            Cookie-free, first party traffic analytics for your site, powered by <a className='text-green' href="https://ghost.org/integrations/tinybird" rel="noopener noreferrer" target='_blank'>Tinybird</a>
                        </>
                }
                label='Web analytics'
                labelClasses='py-4 w-full'
                onChange={(e) => {
                    handleToggleChange('web_analytics', e);
                }}
            />
            {(
                isWebAnalyticsLimited ? (
                    <div className='mb-5 rounded-md border border-grey-200 bg-grey-50 px-4 py-2.5 text-sm dark:border-grey-900 dark:bg-grey-925'>
                        <span className='flex items-start gap-2'>
                            <span>
                            Web analytics is available on the Publisher plan and above. <span className='cursor-pointer text-green' onClick={() => updateRoute({route: '/pro', isExternal: true})}>Upgrade now &rarr;</span>
                            </span>
                        </span>
                    </div>
                ) : !isWebAnalyticsConfigured ? (
                    <div className='mb-5 rounded-md border border-grey-200 bg-grey-50 px-4 py-2.5 text-sm dark:border-grey-900 dark:bg-grey-925'>
                        <span className='flex items-start gap-2'>
                            <span>
                                Web analytics in Ghost is powered by <a className='text-green' href="https://tbrd.co/ghost" rel="noopener noreferrer" target='_blank'>Tinybird</a> and requires configuration to start collecting data. <a className='text-green' href="https://docs.ghost.org/install/docker#tinybird-integration" rel="noopener noreferrer" target='_blank'>Get started &rarr;</a>
                            </span>
                        </span>
                    </div>
                ) : (
                    <Separator className="border-grey-200 dark:border-grey-900" />
                )
            )}
            <Toggle
                checked={trackEmailOpens}
                direction='rtl'
                gap='gap-0'
                hint='Record when a member opens an email'
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
                hint='Record when a member clicks on any link in an email'
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
                hint='Track the traffic sources and posts that drive the most member growth'
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
                hint='Make it easier for other sites to track the traffic you send them in their analytics'
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
                <a className='text-sm text-green' href="https://ghost.org/help/post-analytics/" rel="noopener noreferrer" target="_blank">Learn about analytics</a>
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Analytics, 'Analytics');
