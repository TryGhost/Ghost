import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {SettingGroupContent, TextField, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
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

    const [atprotoOAuthEnabled, atprotoClientName] = getSettingValues<string>(localSettings, [
        'atproto_oauth_enabled',
        'atproto_client_name'
    ]);

    const isEnabled = atprotoOAuthEnabled === 'true' || atprotoOAuthEnabled === true;

    const handleToggle = (checked: boolean) => {
        updateSetting('atproto_oauth_enabled', checked);
    };

    const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('atproto_client_name', e.target.value);
    };

    const values = (
        <SettingGroupContent
            values={[
                {
                    heading: 'Bluesky Login',
                    key: 'atproto-enabled',
                    value: isEnabled ? 'Enabled' : 'Disabled'
                }
            ]}
        />
    );

    const form = (
        <SettingGroupContent columns={1}>
            <Toggle
                checked={isEnabled}
                direction='rtl'
                hint='Allow members and staff to sign in with their Bluesky identity via AT Protocol OAuth'
                label='Enable Bluesky Login'
                onChange={handleToggle}
            />
            {isEnabled && (
                <TextField
                    hint='Display name shown on Bluesky authorization screen (defaults to site title)'
                    placeholder='My Ghost Blog'
                    title='Client Name'
                    value={atprotoClientName || ''}
                    onChange={handleClientNameChange}
                />
            )}
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='Allow members to sign in with their Bluesky account'
            isEditing={isEditing}
            keywords={keywords}
            navid='atproto'
            saveState={saveState}
            testId='atproto-settings'
            title='AT Protocol (Bluesky)'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? form : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(ATProtoSettings, 'AT Protocol settings');
