import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {renderReplyToEmail, renderSenderEmail} from '../utils/newsletter-emails';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useGlobalData} from '../components/providers/global-data-provider';
import {useMemo} from 'react';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

type AutomatedEmailSenderFields = Pick<AutomatedEmail, 'sender_name' | 'sender_email' | 'sender_reply_to'> | null | undefined;

const trimValue = (value: string | null | undefined) => value?.trim() || '';

export const useWelcomeEmailSenderDetails = (automatedEmail: AutomatedEmailSenderFields) => {
    const {settings, config} = useGlobalData();
    const [siteTitle, defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(settings, ['title', 'default_email_address', 'support_email_address']);
    const {data: newslettersData} = useBrowseNewsletters({
        searchParams: {
            filter: 'status:active',
            limit: '1'
        }
    });
    const defaultNewsletter = newslettersData?.newsletters?.[0];

    return useMemo(() => {
        const automatedSenderName = trimValue(automatedEmail?.sender_name);
        const automatedSenderEmail = trimValue(automatedEmail?.sender_email);
        const automatedSenderReplyTo = trimValue(automatedEmail?.sender_reply_to);

        const defaultNewsletterSenderName = trimValue(defaultNewsletter?.sender_name);
        const defaultNewsletterSenderEmail = defaultNewsletter ? trimValue(renderSenderEmail(defaultNewsletter, config, defaultEmailAddress)) : '';
        const defaultNewsletterReplyTo = defaultNewsletter ? trimValue(renderReplyToEmail(defaultNewsletter, config, supportEmailAddress, defaultEmailAddress)) : '';

        const resolvedSenderName = automatedSenderName || defaultNewsletterSenderName || trimValue(siteTitle) || 'Your Site';
        const resolvedSenderEmail = automatedSenderEmail || defaultNewsletterSenderEmail || trimValue(defaultEmailAddress) || '';
        const resolvedReplyToEmail = automatedSenderReplyTo || defaultNewsletterReplyTo || '';
        const hasDistinctReplyTo = resolvedReplyToEmail !== '' && resolvedReplyToEmail !== resolvedSenderEmail;

        return {
            resolvedSenderName,
            resolvedSenderEmail,
            resolvedReplyToEmail,
            defaultNewsletterSenderName,
            hasDistinctReplyTo
        };
    }, [
        automatedEmail?.sender_email,
        automatedEmail?.sender_name,
        automatedEmail?.sender_reply_to,
        config,
        defaultEmailAddress,
        defaultNewsletter,
        siteTitle,
        supportEmailAddress
    ]);
};
