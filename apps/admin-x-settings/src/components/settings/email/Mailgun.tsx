import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {IconLabel, Link, Select, SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const MAILGUN_REGIONS = [
    {label: '🇺🇸 US', value: 'https://api.mailgun.net/v3'},
    {label: '🇪🇺 EU', value: 'https://api.eu.mailgun.net/v3'}
];

const MailGun: React.FC<{ keywords: string[] }> = ({keywords}) => {
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

    const [mailgunRegion, mailgunDomain, mailgunApiKey] = getSettingValues(localSettings, [
        'mailgun_base_url', 'mailgun_domain', 'mailgun_api_key'
    ]) as string[];

    const isMailgunSetup = mailgunDomain && mailgunApiKey;

    const data = isMailgunSetup ? [
        {
            key: 'status',
            value: (
                <IconLabel icon='check-circle' iconColorClass='text-green'>
                    Mailgun is set up
                </IconLabel>
            )
        }
    ] : [
        {
            heading: 'Status',
            key: 'status',
            value: 'Mailgun is not set up'
        }
    ];

    const values = (
        <SettingGroupContent
            columns={1}
            values={data}
        />
    );

    const apiKeysHint = (
        <>Find your Mailgun API keys <Link href="https://app.mailgun.com/settings/api_security" rel="noopener noreferrer" target="_blank">here</Link></>
    );
    const inputs = (
        <SettingGroupContent>
            <div className='grid grid-cols-[120px_auto] gap-x-3 gap-y-6'>
                <Select
                    options={MAILGUN_REGIONS}
                    selectedOption={MAILGUN_REGIONS.find(option => option.value === mailgunRegion)}
                    title="Mailgun region"
                    onSelect={(option) => {
                        updateSetting('mailgun_base_url', option?.value || null);
                    }}
                />
                <TextField
                    title='Mailgun domain'
                    value={mailgunDomain}
                    onChange={(e) => {
                        updateSetting('mailgun_domain', e.target.value);
                    }}
                />
                <div className='col-span-2'>
                    <TextField
                        hint={apiKeysHint}
                        title='Mailgun private API key'
                        type='password'
                        value={mailgunApiKey}
                        onChange={(e) => {
                            updateSetting('mailgun_api_key', e.target.value);
                        }}
                    />
                </div>
            </div>
        </SettingGroupContent>
    );

    const groupDescription = (
        <>The Mailgun API is used for bulk email newsletter delivery. <Link href='https://ghost.org/docs/faq/mailgun-newsletters/' target='_blank'>Why is this required?</Link></>
    );

    return (
        <TopLevelGroup
            description={groupDescription}
            isEditing={isEditing}
            keywords={keywords}
            navid='mailgun'
            saveState={saveState}
            testId='mailgun'
            title='Mailgun'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={async () => {
                // this is a special case where we need to set the region to the default if it's not set,
                // since when the Mailgun Region is not changed, the value doesn't get set in the updateSetting
                // resulting in the mailgun base url remaining null
                // this should not fire if the user has changed the region or if the region is already set
                if (!mailgunRegion) {
                    try {
                        await editSettings([{key: 'mailgun_base_url', value: MAILGUN_REGIONS[0].value}]);
                    } catch (e) {
                        handleError(e);
                        return;
                    }
                }
                handleSave();
            }}
        >
            {isEditing ? inputs : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(MailGun, 'Mailgun');
