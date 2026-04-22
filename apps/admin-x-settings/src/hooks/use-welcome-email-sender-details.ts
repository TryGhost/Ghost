import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {resolveWelcomeEmailSenderDetails} from '../utils/welcome-email-sender-details';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useGlobalData} from '../components/providers/global-data-provider';
import {useMemo} from 'react';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

type AutomatedEmailSenderFields = Pick<AutomatedEmail, 'slug' | 'sender_name' | 'sender_email' | 'sender_reply_to'>;

export const useWelcomeEmailSenderDetails = (automatedEmails: AutomatedEmailSenderFields[] = []) => {
    const {settings, config} = useGlobalData();
    const [siteTitle, defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(settings, ['title', 'default_email_address', 'support_email_address']);
    const {data: newslettersData} = useBrowseNewsletters({
        searchParams: {
            filter: 'status:active',
            limit: '1'
        }
    });
    const defaultNewsletter = newslettersData?.newsletters?.[0];

    return useMemo(() => resolveWelcomeEmailSenderDetails({
        automatedEmails,
        config,
        defaultEmailAddress,
        newsletter: defaultNewsletter,
        siteTitle,
        supportEmailAddress
    }), [automatedEmails, config, defaultEmailAddress, defaultNewsletter, siteTitle, supportEmailAddress]);
};
