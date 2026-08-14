// NOTE: duplicated in apps/admin-x-settings/src/hooks/use-welcome-email-sender-details.ts — the email design modal needs it in both apps until Automations GAs; keep in sync
import {resolveWelcomeEmailSenderDetails} from '@/automations/utils/welcome-email-sender-details';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useMemo} from 'react';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import type {Config} from '@tryghost/admin-x-framework/api/config';

type AutomatedEmailSenderFields = Pick<AutomatedEmail, 'slug' | 'sender_name' | 'sender_email' | 'sender_reply_to'>;

interface WelcomeEmailSenderDetailsOptions {
    config: Config;
    defaultEmailAddress?: string | null;
    siteTitle?: string | null;
    supportEmailAddress?: string | null;
}

export const useWelcomeEmailSenderDetails = (automatedEmails: AutomatedEmailSenderFields[] = [], {
    config,
    defaultEmailAddress,
    siteTitle,
    supportEmailAddress
}: WelcomeEmailSenderDetailsOptions) => {
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
