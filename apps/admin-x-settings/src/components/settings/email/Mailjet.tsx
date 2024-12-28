import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {IconLabel, Icon, Link, SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const Mailjet: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const [mailjetApiKey, mailjetSecretKey] = getSettingValues(localSettings, [
        'mailjet_api_key',
        'mailjet_secret_key'
    ]) as string[];

    console.log("mailjetSecretKey", mailjetSecretKey);
    const isMailjetSetup = mailjetApiKey && mailjetSecretKey;

    const data = isMailjetSetup ? [
        {
            key: 'status',
            value: (<div className='flex items-center gap-2'>
                      <Icon colorClass='text-green' name='check' size='sm' />
                      <span>Enabled</span>
                    </div>)
        }
    ] : [
        {
            heading: 'Status',
            key: 'status',
            value: 'Mailjet is not set up'
        }
    ];

    const values = (
        <SettingGroupContent
            columns={1}
            values={data}
        />
    );

    const inputs = (
        <SettingGroupContent>
            <TextField
                error={!mailjetApiKey && isEditing}
                title="Mailjet API Key"
                value={mailjetApiKey}
                hint="Find your API Key in Mailjet's account settings"
                onChange={e => updateSetting('mailjet_api_key', e.target.value)}
            />
            <TextField
                error={!mailjetSecretKey && isEditing}
                title="Mailjet Secret Key"
                value={mailjetSecretKey}
                hint="Find your Secret Key in Mailjet's account settings"
                onChange={e => {console.log(updateSetting, e.target.value); updateSetting('mailjet_secret_key', e.target.value)}}
            />
            <div className="mt-1">
                <Link href="https://app.mailjet.com/account/apikeys" target="_blank">
                    Get your Mailjet API keys here →
                </Link>
            </div>
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description="Configure Mailjet to send your newsletter emails"
            isEditing={isEditing}
            keywords={keywords}
            navid="mailjet"
            saveState={saveState}
            testId="mailjet"
            title="Mailjet"
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputs: values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Mailjet, 'Mailjet');