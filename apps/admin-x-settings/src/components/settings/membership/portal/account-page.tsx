import React, {type FocusEventHandler, useEffect, useState} from 'react';
import validator from 'validator';
import {Form, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {type SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {fullEmailAddress, getEmailDomain} from '@tryghost/admin-x-framework/api/site';
import {useGlobalData} from '../../../providers/global-data-provider';

const AccountPage: React.FC<{
    updateSetting: (key: string, setting: SettingValue) => void
    errors: Record<string, string | undefined>
    setError: (key: string, error: string | undefined) => void
}> = ({updateSetting, errors, setError}) => {
    const {siteData, settings, config} = useGlobalData();
    const [membersSupportAddress, supportEmailAddress] = getSettingValues(settings, ['members_support_address', 'support_email_address']);
    const calculatedSupportAddress = supportEmailAddress?.toString() || fullEmailAddress(membersSupportAddress?.toString() || '', siteData!, config);
    const emailDomain = getEmailDomain(siteData!, config);
    const [value, setValue] = useState(calculatedSupportAddress);
    const [showPodcastsLink, setShowPodcastsLink] = useState(true);
    const [podcastsTitle, setPodcastsTitle] = useState('Podcasts');
    const [podcastsDescription, setPodcastsDescription] = useState('Update your podcast subscriptions');
    const [podcastsButtonLabel, setPodcastsButtonLabel] = useState('Manage');
    const [podcastsButtonUrl, setPodcastsButtonUrl] = useState('https://transistor.fm/example-podcasts/');

    const updateSupportAddress: FocusEventHandler<HTMLInputElement> = (e) => {
        let supportAddress = e.target.value;

        if (!supportAddress) {
            setError('members_support_address', 'Enter an email address');
        } else if (!validator.isEmail(supportAddress)) {
            setError('members_support_address', 'Enter a valid email address');
        } else {
            setError('members_support_address', '');
        }

        let settingValue = emailDomain && supportAddress === `noreply@${emailDomain}` ? 'noreply' : supportAddress;

        updateSetting('members_support_address', settingValue);
        setValue(fullEmailAddress(settingValue, siteData!, config));
    };

    useEffect(() => {
        setValue(calculatedSupportAddress);
    }, [calculatedSupportAddress]);

    return <div className='mt-7'><Form>
        <TextField
            error={!!errors.members_support_address}
            hint={errors.members_support_address}
            title='Support email address'
            value={value}
            onBlur={updateSupportAddress}
            onChange={e => setValue(e.target.value)}
        />

        <Toggle
            checked={showPodcastsLink}
            direction='rtl'
            label='Show podcasts link in Portal'
            onChange={e => setShowPodcastsLink(e.target.checked)}
        />

        {showPodcastsLink && <div className='-mt-4 flex flex-col gap-6'>
            <TextField
                title='Title'
                value={podcastsTitle}
                onChange={e => setPodcastsTitle(e.target.value)}
            />
            <TextField
                title='Description'
                value={podcastsDescription}
                onChange={e => setPodcastsDescription(e.target.value)}
            />
            <TextField
                title='Button label'
                value={podcastsButtonLabel}
                onChange={e => setPodcastsButtonLabel(e.target.value)}
            />
            <TextField
                title='Button URL'
                value={podcastsButtonUrl}
                onChange={e => setPodcastsButtonUrl(e.target.value)}
            />
        </div>}
    </Form></div>;
};

export default AccountPage;
