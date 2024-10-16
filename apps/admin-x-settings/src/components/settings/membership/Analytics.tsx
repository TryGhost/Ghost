import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Button, SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
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
        <SettingGroupContent className='!gap-y-0' columns={1}>
            {[
                {key: 'email_track_opens', label: 'Newsletter opens', checked: trackEmailOpens},
                {key: 'email_track_clicks', label: 'Newsletter clicks', checked: trackEmailClicks},
                {key: 'members_track_sources', label: 'Member sources', checked: trackMemberSources},
                {key: 'outbound_link_tagging', label: 'Outbound link tagging', checked: outboundLinkTagging}
            ].map(({key, label, checked}, index, array) => (
                <div 
                    key={key} 
                    className={`flex items-center justify-between py-3 ${
                        index !== array.length - 1 ? 'border-b border-grey-200' : ''
                    }`}
                >
                    <span>{label}</span>
                    <Toggle
                        checked={checked}
                        onChange={(e) => {
                            handleToggleChange(key, e);
                        }}
                    />
                </div>
            ))}
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='Decide what data you collect from your members'
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
                <Button color='green' label='Export' link linkWithPadding onClick={exportPosts} />
                <a className='text-sm text-green' href="https://ghost.org/help/post-analytics/" rel="noopener noreferrer" target="_blank">Learn about analytics</a>
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Analytics, 'Analytics');
