import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

const MultiFactorAuth: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [require2fa] = getSettingValues(localSettings, [
        'require_email_mfa'
    ]) as boolean[];

    const handleToggleChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting(key, e.target.checked);
        handleEditingChange(true);
    };

    const inputs = (
        <SettingGroupContent className="analytics-settings !gap-y-0" columns={1}>
            <Toggle
                checked={require2fa}
                direction='rtl'
                gap='gap-0'
                label='Require email 2FA'
                labelClasses='py-4 w-full'
                onChange={(e) => {
                    handleToggleChange('require_email_mfa', e);
                }}
            />
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='Require 2FA for all logins for additional security'
            isEditing={isEditing}
            keywords={keywords}
            navid='multi-factor-auth'
            saveState={saveState}
            testId='multi-factor-auth'
            title='Email 2FA'
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {inputs}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(MultiFactorAuth, 'Email 2FA');
