import {getSettingValues, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {resolveEmailSenderDetails} from './sender-details';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useMemo} from 'react';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import type {Config} from '@tryghost/admin-x-framework/api/config';

type AutomatedEmailSenderFields = Pick<AutomatedEmail, 'slug' | 'sender_name' | 'sender_email' | 'sender_reply_to'>;

// Resolves the sender identity for the preview/test render. Reads settings and
// config directly from framework hooks so it works on routes that don't mount a
// global data provider.
export const useEmailSenderDetails = (automatedEmails: AutomatedEmailSenderFields[] = []) => {
    const {data: settingsData} = useBrowseSettings();
    const {data: configData} = useBrowseConfig();
    const settings = settingsData?.settings || [];
    const config = useMemo(() => (configData?.config || {}) as Config, [configData]);
    const [siteTitle, defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(settings, ['title', 'default_email_address', 'support_email_address']);
    const {data: newslettersData} = useBrowseNewsletters({
        searchParams: {
            filter: 'status:active',
            limit: '1'
        }
    });
    const defaultNewsletter = newslettersData?.newsletters?.[0];

    return useMemo(() => resolveEmailSenderDetails({
        automatedEmails,
        config,
        defaultEmailAddress,
        newsletter: defaultNewsletter,
        siteTitle,
        supportEmailAddress
    }), [automatedEmails, config, defaultEmailAddress, defaultNewsletter, siteTitle, supportEmailAddress]);
};
