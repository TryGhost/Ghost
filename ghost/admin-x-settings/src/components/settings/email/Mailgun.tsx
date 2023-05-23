import Dropdown from '../../../admin-x-ds/global/Dropdown';
import Link from '../../../admin-x-ds/global/Link';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/TextField';
import useSettingGroup from '../../../hooks/useSettingGroup';

const MAILGUN_REGIONS = [
    {label: '🇺🇸 US', value: 'https://api.mailgun.net/v3'},
    {label: '🇪🇺 EU', value: 'https://api.eu.mailgun.net/v3'}
];

const MailGun: React.FC = () => {
    const {
        currentState,
        handleSave,
        handleCancel,
        updateSetting,
        getSettingValues,
        handleStateChange
    } = useSettingGroup();

    const [mailgunRegion, mailgunDomain, mailgunApiKey] = getSettingValues([
        'mailgun_base_url', 'mailgun_domain', 'mailgun_api_key'
    ]) as string[];

    const isMailgunSetup = mailgunRegion && mailgunDomain && mailgunApiKey;

    const data = isMailgunSetup ? [
        {
            heading: 'Status',
            key: 'status',
            value: 'Mailgun is set up ✅'
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
        <>Find your Mailgun API keys <Link href="https://app.mailgun.com/app/account/security/api_keys" rel="noopener noreferrer" target="_blank">here</Link></>
    );

    const inputs = (
        <SettingGroupContent>
            <div className='grid grid-cols-[0.25fr_0.75fr] gap-6'>
                <Dropdown
                    defaultSelectedOption={mailgunRegion}
                    options={MAILGUN_REGIONS}
                    title="Mailgun region"
                    onSelect={(value) => {
                        updateSetting('mailgun_base_url', value);
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
        <SettingGroup
            description={groupDescription}
            state={currentState}
            title='Mailgun'
            onCancel={handleCancel}
            onSave={handleSave}
            onStateChange={handleStateChange}
        >
            {currentState === 'view' ? values : inputs}
        </SettingGroup>
    );
};

export default MailGun;