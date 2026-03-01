import FakeLogo from '../../../assets/images/explore-default-logo.png';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import WelcomeEmailModal from './member-emails/welcome-email-modal';
import {Separator, SettingGroupContent, Toggle, showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useAddAutomatedEmail, useBrowseAutomatedEmails, useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useWelcomeEmailSenderDetails} from '../../../hooks/use-welcome-email-sender-details';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

// Default welcome email content in Lexical JSON format
// Uses __GHOST_URL__ placeholder which Ghost replaces with the actual site URL
const DEFAULT_FREE_LEXICAL_CONTENT = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome! Thanks for subscribing — it\'s great to have you here.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"You\'ll now receive new posts straight to your inbox. You can also log in any time to read the ","type":"extended-text","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"full archive","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":"noreferrer","target":null,"title":null,"url":"__GHOST_URL__/"},{"detail":0,"format":0,"mode":"normal","style":"","text":" or catch up on new posts as they go live.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"A little housekeeping: If this email landed in spam or promotions, try moving it to your primary inbox and adding this address to your contacts. Small signals like that help your inbox recognize that these messages matter to you.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Have questions or just want to say hi? Feel free to reply directly to this email or any newsletter in the future.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

const DEFAULT_PAID_LEXICAL_CONTENT = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome, and thank you for your support — it means a lot.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"As a paid member, you now have full access to everything: the complete archive, and any paid-only content going forward. New posts will land straight to your inbox, and you can log in any time to ","type":"extended-text","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"catch up","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":"noreferrer","target":null,"title":null,"url":"__GHOST_URL__/"},{"detail":0,"format":0,"mode":"normal","style":"","text":" on anything you\'ve missed.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"A little housekeeping: If this email landed in spam or promotions, try moving it to your primary inbox and adding this address to your contacts. Small signals like that help your inbox recognize that these messages matter to you.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Have questions or just want to say hi? Feel free to reply directly to this email or any newsletter in the future.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

const EmailPreview: React.FC<{
    automatedEmail: AutomatedEmail,
    emailType: 'free' | 'paid',
    enabled: boolean,
    isInitialLoading: boolean,
    onEdit: () => void,
    onToggle: () => void
}> = ({
    automatedEmail,
    emailType,
    enabled,
    isInitialLoading,
    onEdit,
    onToggle
}) => {
    const {settings} = useGlobalData();
    const [accentColor, icon] = getSettingValues<string>(settings, ['accent_color', 'icon']);
    const color = accentColor || '#F6414E';
    const {resolvedSenderName} = useWelcomeEmailSenderDetails(automatedEmail);

    return (
        <div
            className='relative flex w-full items-center justify-between gap-6 rounded-lg border border-grey-100 bg-grey-50 p-5 text-left transition-all hover:border-grey-200 hover:shadow-sm dark:border-grey-925 dark:bg-grey-975 dark:hover:border-grey-800'
            data-testid={`${emailType}-welcome-email-preview`}
        >
            <button
                className='flex w-full cursor-pointer items-center justify-between before:absolute before:inset-0 before:rounded-lg before:content-[""] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-green'
                type='button'
                onClick={onEdit}
            >
                <div className='flex items-start gap-3'>
                    {icon ?
                        <div className='size-10 min-h-10 min-w-10 rounded-sm bg-cover bg-center' style={{
                            backgroundImage: `url(${icon})`
                        }} />
                        :
                        <div className='flex aspect-square size-10 items-center justify-center overflow-hidden rounded-full p-1 text-white' style={{
                            backgroundColor: color
                        }}>
                            <img alt="" className='h-auto w-8' src={FakeLogo} />
                        </div>
                    }
                    <div className='text-left'>
                        <div className='font-semibold'>{resolvedSenderName}</div>
                        <div className='text-sm'>{automatedEmail.subject}</div>
                    </div>
                </div>
                <div className='text-sm font-semibold opacity-100 transition-all hover:opacity-80'>
                    Edit
                </div>
            </button>
            <div className='relative z-10 rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green'>
                {isInitialLoading ? (
                    <div className="h-4 w-7 rounded-full bg-grey-300 dark:bg-grey-800" />
                ) : (
                    <Toggle
                        checked={enabled}
                        onChange={onToggle}
                    />
                )}
            </div>
        </div>
    );
};

const EmailSettingRow: React.FC<{
    title: string,
    description: string
}> = ({title, description}) => {
    return (
        <div className='flex items-center justify-between py-4'>
            <div>
                <div className='font-medium'>{title}</div>
                <div className='text-sm text-grey-700 dark:text-grey-600'>{description}</div>
            </div>
        </div>
    );
};

const MemberEmails: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings, config} = useGlobalData();
    const [siteTitle] = getSettingValues<string>(settings, ['title']);

    const {data: automatedEmailsData, isLoading} = useBrowseAutomatedEmails();
    const {mutateAsync: addAutomatedEmail, isLoading: isAddingAutomatedEmail} = useAddAutomatedEmail();
    const {mutateAsync: editAutomatedEmail, isLoading: isEditingAutomatedEmail} = useEditAutomatedEmail();
    const handleError = useHandleError();

    const automatedEmails = automatedEmailsData?.automated_emails || [];
    const isMutating = isAddingAutomatedEmail || isEditingAutomatedEmail;
    const isBusy = isLoading || isMutating;

    const freeWelcomeEmail = automatedEmails.find(email => email.slug === 'member-welcome-email-free');
    const paidWelcomeEmail = automatedEmails.find(email => email.slug === 'member-welcome-email-paid');

    const freeWelcomeEmailEnabled = freeWelcomeEmail?.status === 'active';
    const paidWelcomeEmailEnabled = paidWelcomeEmail?.status === 'active';

    // Helper to get default values for an email type
    const getDefaultEmailValues = (emailType: 'free' | 'paid') => ({
        name: emailType === 'free' ? 'Welcome Email (Free)' : 'Welcome Email (Paid)',
        slug: `member-welcome-email-${emailType}`,
        subject: emailType === 'free'
            ? `Welcome to ${siteTitle || 'our site'}`
            : 'Welcome to your paid subscription',
        lexical: emailType === 'free' ? DEFAULT_FREE_LEXICAL_CONTENT : DEFAULT_PAID_LEXICAL_CONTENT
    });

    // Create default email objects for display when no DB row exists
    const getDefaultEmail = (emailType: 'free' | 'paid'): AutomatedEmail => ({
        id: '',
        status: 'inactive',
        ...getDefaultEmailValues(emailType),
        sender_name: null,
        sender_email: null,
        sender_reply_to: null,
        created_at: '',
        updated_at: null
    });

    // Create a new automated email row with the given status
    const createAutomatedEmail = async (emailType: 'free' | 'paid', status: 'active' | 'inactive') => {
        const defaults = getDefaultEmailValues(emailType);
        return addAutomatedEmail({...defaults, status});
    };

    const handleToggle = async (emailType: 'free' | 'paid') => {
        const slug = `member-welcome-email-${emailType}`;
        const existing = automatedEmails.find(email => email.slug === slug);
        const label = emailType === 'free' ? 'Free members' : 'Paid members';

        if (isBusy) {
            return;
        }

        try {
            if (!existing) {
                await createAutomatedEmail(emailType, 'active');
                showToast({type: 'success', title: `${label} welcome email enabled`});
            } else if (existing.status === 'active') {
                await editAutomatedEmail({...existing, status: 'inactive'});
                showToast({type: 'success', title: `${label} welcome email disabled`});
            } else {
                await editAutomatedEmail({...existing, status: 'active'});
                showToast({type: 'success', title: `${label} welcome email enabled`});
            }
        } catch (e) {
            handleError(e);
        }
    };

    // Handle Edit button click - creates inactive row if needed, then opens modal
    const handleEditClick = async (emailType: 'free' | 'paid') => {
        const slug = `member-welcome-email-${emailType}`;
        const existing = automatedEmails.find(email => email.slug === slug);

        if (isBusy) {
            return;
        }

        if (!existing) {
            try {
                const result = await createAutomatedEmail(emailType, 'inactive');
                const newEmail = result?.automated_emails?.[0];
                if (newEmail) {
                    NiceModal.show(WelcomeEmailModal, {emailType, automatedEmail: newEmail});
                }
            } catch (e) {
                handleError(e);
            }
        } else {
            NiceModal.show(WelcomeEmailModal, {emailType, automatedEmail: existing});
        }
    };

    // Get email to display (existing or default for preview)
    const freeEmailForDisplay = freeWelcomeEmail || getDefaultEmail('free');
    const paidEmailForDisplay = paidWelcomeEmail || getDefaultEmail('paid');

    return (
        <TopLevelGroup
            description="Create and manage automated emails for your members"
            keywords={keywords}
            navid='memberemails'
            testId='memberemails'
            title='Welcome emails'
        >
            <SettingGroupContent className="!gap-y-0" columns={1}>
                <Separator />
                <EmailSettingRow
                    description='Sent to new free members right after they join your site.'
                    title='Free members'
                />
                <EmailPreview
                    automatedEmail={freeEmailForDisplay}
                    emailType='free'
                    enabled={freeWelcomeEmailEnabled}
                    isInitialLoading={isLoading}
                    onEdit={() => handleEditClick('free')}
                    onToggle={() => handleToggle('free')}
                />
                {checkStripeEnabled(settings, config) && (
                    <div className='mt-4'>
                        <EmailSettingRow
                            description='Sent to new paid members right after they start their subscription.'
                            title='Paid members'
                        />
                        <EmailPreview
                            automatedEmail={paidEmailForDisplay}
                            emailType='paid'
                            enabled={paidWelcomeEmailEnabled}
                            isInitialLoading={isLoading}
                            onEdit={() => handleEditClick('paid')}
                            onToggle={() => handleToggle('paid')}
                        />
                    </div>
                )}
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(MemberEmails, 'MemberEmails');
