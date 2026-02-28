import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {SettingGroupContent, Separator, TextField, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

const ATProtoSettings: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [
        atprotoOAuthEnabled,
        atprotoClientName,
        blueskyBlogHandle,
        blueskyBlogAppPassword,
        blueskyCommentSyncEnabled
    ] = getSettingValues<string>(localSettings, [
        'atproto_oauth_enabled',
        'atproto_client_name',
        'bluesky_blog_handle',
        'bluesky_blog_app_password',
        'bluesky_comment_sync_enabled'
    ]);

    const isEnabled = atprotoOAuthEnabled === 'true';
    const isSyncEnabled = blueskyCommentSyncEnabled === 'true';
    const hasBlogAccount = !!blueskyBlogHandle;

    const values = (
        <SettingGroupContent
            values={[
                {
                    heading: 'Bluesky Login',
                    key: 'atproto-enabled',
                    value: isEnabled ? 'Enabled' : 'Disabled'
                },
                {
                    heading: 'Blog Account',
                    key: 'blog-account',
                    value: hasBlogAccount ? `@${blueskyBlogHandle}` : 'Not connected'
                },
                {
                    heading: 'Comment Sync',
                    key: 'comment-sync',
                    value: isSyncEnabled ? 'Enabled' : 'Disabled'
                }
            ]}
        />
    );

    const form = (
        <SettingGroupContent columns={1}>
            <Toggle
                checked={isEnabled}
                direction='rtl'
                hint='Allow members to sign in with their Bluesky identity'
                label='Enable Bluesky Login'
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('atproto_oauth_enabled', e.target.checked)}
            />
            {isEnabled && (
                <TextField
                    hint='Display name shown on Bluesky authorization screen (defaults to site title)'
                    placeholder='My Ghost Blog'
                    title='Client Name'
                    value={atprotoClientName || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('atproto_client_name', e.target.value)}
                />
            )}
            <Separator />
            <TextField
                hint='Your blog&apos;s Bluesky handle (e.g. myblog.bsky.social). Used to publish posts and sync comments.'
                placeholder='myblog.bsky.social'
                title='Blog Bluesky Handle'
                value={blueskyBlogHandle || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('bluesky_blog_handle', e.target.value)}
            />
            {hasBlogAccount && (
                <>
                    <TextField
                        hint='App password from Bluesky Settings > App Passwords. Never use your main password.'
                        placeholder='xxxx-xxxx-xxxx-xxxx'
                        title='App Password'
                        type='password'
                        value={blueskyBlogAppPassword || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('bluesky_blog_app_password', e.target.value)}
                    />
                    <Toggle
                        checked={isSyncEnabled}
                        direction='rtl'
                        hint='Pull Bluesky replies into Ghost comments and post Ghost comments to Bluesky threads'
                        label='Bidirectional Comment Sync'
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('bluesky_comment_sync_enabled', e.target.checked)}
                    />
                </>
            )}
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='Connect your blog to Bluesky for login, publishing, and comments'
            isEditing={isEditing}
            keywords={keywords}
            navid='atproto'
            saveState={saveState}
            testId='atproto-settings'
            title='Bluesky'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? form : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(ATProtoSettings, 'Bluesky settings');
