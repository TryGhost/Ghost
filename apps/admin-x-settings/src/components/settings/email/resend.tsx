import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {IconLabel, Link, SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

const Resend: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [resendApiKey] = getSettingValues(localSettings, ['resend_api_key']) as string[];

    const isResendSetup = !!resendApiKey;

    const data = isResendSetup ? [
        {
            key: 'status',
            value: (
                <IconLabel icon='check-circle' iconColorClass='text-green'>
                    Resend is set up
                </IconLabel>
            )
        }
    ] : [
        {
            heading: 'Status',
            key: 'status',
            value: 'Resend is not set up'
        }
    ];

    const values = (
        <SettingGroupContent
            columns={1}
            values={data}
        />
    );

    const apiKeyHint = (
        <>Find your Resend API keys <Link href="https://resend.com/api-keys" rel="noopener noreferrer" target="_blank">here</Link></>
    );

    const inputs = (
        <SettingGroupContent>
            <TextField
                hint={apiKeyHint}
                title='Resend API key'
                type='password'
                value={resendApiKey}
                onChange={(e) => {
                    updateSetting('resend_api_key', e.target.value);
                }}
            />
        </SettingGroupContent>
    );

    const groupDescription = (
        <>The Resend API is used for bulk email newsletter delivery. <Link href='https://resend.com/docs' target='_blank'>Learn more</Link></>
    );

    return (
        <TopLevelGroup
            description={groupDescription}
            isEditing={isEditing}
            keywords={keywords}
            navid='resend'
            saveState={saveState}
            testId='resend'
            title='Resend'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputs : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Resend, 'Resend');
