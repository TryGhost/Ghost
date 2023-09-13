import Button from '../../../admin-x-ds/global/Button';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import Toggle from '../../../admin-x-ds/global/form/Toggle';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {getSettingValues} from '../../../api/settings';
import {usePostsExports} from '../../../api/posts';

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

    const [trackEmailOpens, trackEmailClicks, trackMemberSources, outboundLinkTagging] = getSettingValues(localSettings, [
        'email_track_opens', 'email_track_clicks', 'members_track_sources', 'outbound_link_tagging'
    ]) as boolean[];

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
        <SettingGroupContent columns={2}>
            <Toggle
                checked={trackEmailOpens}
                direction='rtl'
                hint='Record when a member opens an email'
                label='Newsletter opens'
                onChange={(e) => {
                    handleToggleChange('email_track_opens', e);
                }}
            />
            <Toggle
                checked={trackEmailClicks}
                direction='rtl'
                hint='Record when a member clicks on any link in an email'
                label='Newsletter clicks'
                onChange={(e) => {
                    handleToggleChange('email_track_clicks', e);
                }}
            />
            <Toggle
                checked={trackMemberSources}
                direction='rtl'
                hint='Track the traffic sources and posts that drive the most member growth'
                label='Member sources'
                onChange={(e) => {
                    handleToggleChange('members_track_sources', e);
                }}
            />
            <Toggle
                checked={outboundLinkTagging}
                direction='rtl'
                hint='Make it easier for other sites to track the traffic you send them in their analytics'
                label='Outbound link tagging'
                onChange={(e) => {
                    handleToggleChange('outbound_link_tagging', e);
                }}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='Decide what data you collect from your members'
            hideEditButton={true}
            isEditing={isEditing}
            keywords={keywords}
            navid='analytics'
            saveState={saveState}
            testId='analytics'
            title='Analytics'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {inputs}
            <div className='mt-1'>
                <Button color='green' label='Export post analytics' link={true} onClick={exportPosts} />
                <div className='text-xs text-grey-700 dark:text-grey-600'>Download the data from your last 1,000 posts</div>
            </div>
        </SettingGroup>
    );
};

export default Analytics;
