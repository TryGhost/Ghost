import FakeLogo from '../../../assets/images/explore-default-logo.png';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import WelcomeEmailModal from './member-emails/welcome-email-modal';
import {Button, Separator, SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useAddAutomatedEmail, useBrowseAutomatedEmails, useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

// Default welcome email content in Lexical JSON format
// Uses __GHOST_URL__ placeholder which Ghost replaces with the actual site URL
const DEFAULT_FREE_LEXICAL_CONTENT = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome! Thanks for subscribing — it\'s great to have you here.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"You\'ll now receive new posts straight to your inbox. You can also log in any time to read the ","type":"extended-text","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"full archive","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":"noreferrer","target":null,"title":null,"url":"__GHOST_URL__/"},{"detail":0,"format":0,"mode":"normal","style":"","text":" or catch up on new posts as they go live.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"A little housekeeping: If this email landed in spam or promotions, try moving it to your primary inbox and adding this address to your contacts. Small signals like that help your inbox recognize that these messages matter to you.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Have questions or just want to say hi? Feel free to reply directly to this email or any newsletter in the future.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

const DEFAULT_PAID_LEXICAL_CONTENT = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome, and thank you for your support — it means a lot.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"As a paid member, you now have full access to everything: the complete archive, and any paid-only content going forward. New posts will land straight to your inbox, and you can log in any time to ","type":"extended-text","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"catch up","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":"noreferrer","target":null,"title":null,"url":"__GHOST_URL__/"},{"detail":0,"format":0,"mode":"normal","style":"","text":" on anything you\'ve missed.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"A little housekeeping: If this email landed in spam or promotions, try moving it to your primary inbox and adding this address to your contacts. Small signals like that help your inbox recognize that these messages matter to you.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Have questions or just want to say hi? Feel free to reply directly to this email or any newsletter in the future.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

const EmailPreview: React.FC<{
    automatedEmail: AutomatedEmail,
    emailType: 'free' | 'paid'
}> = ({
    automatedEmail,
    emailType
}) => {
    const {settings} = useGlobalData();
    const [accentColor, icon, siteTitle] = getSettingValues<string>(settings, ['accent_color', 'icon', 'title']);
    const color = accentColor || '#F6414E';

    const senderName = automatedEmail.sender_name || siteTitle || 'Your Site';

    return (
        <div className='mb-5 flex items-center justify-between gap-3 rounded-lg border border-grey-100 bg-grey-50 p-5 dark:border-grey-925 dark:bg-grey-975'>
            <div className='flex items-start gap-3'>
                {icon ?
                    <div className='size-10 min-h-10 min-w-10 rounded-sm bg-cover bg-center' style={{
                        backgroundImage: `url(${icon})`
                    }} />
                    :
                    <div className='flex aspect-square size-10 items-center justify-center overflow-hidden rounded-full p-1 text-white' style={{
                        backgroundColor: color
                    }}>
                        <img className='h-auto w-8' src={FakeLogo} />
                    </div>
                }
                <div>
                    <div className='font-semibold'>{senderName}</div>
                    <div className='text-sm'>{automatedEmail.subject}</div>
                </div>
            </div>
            <Button
                className='border border-grey-200 font-semibold hover:border-grey-300 hover:!bg-white dark:border-grey-900 dark:hover:border-grey-800 dark:hover:!bg-grey-950'
                color='white'
                data-testid={`${emailType}-welcome-email-edit-button`}
                icon='pen'
                label='Edit'
                onClick={() => {
                    NiceModal.show(WelcomeEmailModal, {emailType, automatedEmail});
                }}
            />
        </div>
    );
};

const MemberEmails: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings, config} = useGlobalData();
    const [siteTitle] = getSettingValues<string>(settings, ['title']);

    const {data: automatedEmailsData, isLoading} = useBrowseAutomatedEmails();
    const {mutateAsync: addAutomatedEmail} = useAddAutomatedEmail();
    const {mutateAsync: editAutomatedEmail} = useEditAutomatedEmail();
    const handleError = useHandleError();

    const automatedEmails = automatedEmailsData?.automated_emails || [];

    const freeWelcomeEmail = automatedEmails.find(email => email.slug === 'member-welcome-email-free');
    const paidWelcomeEmail = automatedEmails.find(email => email.slug === 'member-welcome-email-paid');

    const freeWelcomeEmailEnabled = freeWelcomeEmail?.status === 'active';
    const paidWelcomeEmailEnabled = paidWelcomeEmail?.status === 'active';

    const handleToggle = async (emailType: 'free' | 'paid') => {
        const slug = `member-welcome-email-${emailType}`;
        const existing = automatedEmails.find(email => email.slug === slug);

        const defaultSubject = emailType === 'free'
            ? `Welcome to ${siteTitle || 'our site'}`
            : 'Welcome to your paid subscription';

        try {
            if (!existing) {
                // First toggle ON - create with defaults
                const defaultContent = emailType === 'free'
                    ? DEFAULT_FREE_LEXICAL_CONTENT
                    : DEFAULT_PAID_LEXICAL_CONTENT;
                await addAutomatedEmail({
                    name: emailType === 'free' ? 'Welcome Email (Free)' : 'Welcome Email (Paid)',
                    slug: slug,
                    subject: defaultSubject,
                    status: 'active',
                    lexical: defaultContent
                });
            } else if (existing.status === 'active') {
                // Toggle OFF
                await editAutomatedEmail({...existing, status: 'inactive'});
            } else {
                // Toggle ON (re-enable)
                await editAutomatedEmail({...existing, status: 'active'});
            }
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <TopLevelGroup
            description="Create and manage automated emails that are sent to your members."
            keywords={keywords}
            navid='memberemails'
            testId='memberemails'
            title='Welcome emails'
        >
            <SettingGroupContent className="!gap-y-0" columns={1}>
                <Separator />
                <Toggle
                    key={`free-${isLoading ? 'loading' : freeWelcomeEmail?.status ?? 'none'}`}
                    checked={Boolean(freeWelcomeEmailEnabled)}
                    containerClasses='items-center'
                    direction='rtl'
                    disabled={isLoading}
                    gap='gap-0'
                    hint='Email new free members receive when they join your site.'
                    label='Free members welcome email'
                    labelClasses='py-4 w-full'
                    onChange={() => handleToggle('free')}
                />
                {freeWelcomeEmail && freeWelcomeEmailEnabled &&
                    <EmailPreview
                        automatedEmail={freeWelcomeEmail}
                        emailType='free'
                    />
                }
                {checkStripeEnabled(settings, config) && (
                    <>
                        <Separator />
                        <Toggle
                            key={`paid-${isLoading ? 'loading' : paidWelcomeEmail?.status ?? 'none'}`}
                            checked={Boolean(paidWelcomeEmailEnabled)}
                            containerClasses='items-center'
                            direction='rtl'
                            disabled={isLoading}
                            gap='gap-0'
                            hint='Sent to new paid members as soon as they start their subscription.'
                            label='Paid members welcome email'
                            labelClasses='py-4 w-full'
                            onChange={() => handleToggle('paid')}
                        />
                        {paidWelcomeEmail && paidWelcomeEmailEnabled &&
                            <EmailPreview
                                automatedEmail={paidWelcomeEmail}
                                emailType='paid'
                            />
                        }
                    </>
                )}
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(MemberEmails, 'MemberEmails');
