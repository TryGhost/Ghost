import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import WelcomeEmailCustomizeModal from './member-emails/welcome-email-customize-modal';
import WelcomeEmailModal from './member-emails/welcome-email-modal';
import useFeatureFlag from '../../../hooks/use-feature-flag';
import {Button, Icon, Table, TableRow, Toggle, showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useAddAutomatedEmail, useBrowseAutomatedEmails, useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

// Default welcome email content in Lexical JSON format
// Uses __GHOST_URL__ placeholder which Ghost replaces with the actual site URL
const DEFAULT_FREE_LEXICAL_CONTENT = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome! Thanks for subscribing — it\'s great to have you here.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"You\'ll now receive new posts straight to your inbox. You can also log in any time to read the ","type":"extended-text","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"full archive","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":"noreferrer","target":null,"title":null,"url":"__GHOST_URL__/"},{"detail":0,"format":0,"mode":"normal","style":"","text":" or catch up on new posts as they go live.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"A little housekeeping: If this email landed in spam or promotions, try moving it to your primary inbox and adding this address to your contacts. Small signals like that help your inbox recognize that these messages matter to you.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Have questions or just want to say hi? Feel free to reply directly to this email or any newsletter in the future.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

const DEFAULT_PAID_LEXICAL_CONTENT = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome, and thank you for your support — it means a lot.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"As a paid member, you now have full access to everything: the complete archive, and any paid-only content going forward. New posts will land straight to your inbox, and you can log in any time to ","type":"extended-text","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"catch up","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"link","version":1,"rel":"noreferrer","target":null,"title":null,"url":"__GHOST_URL__/"},{"detail":0,"format":0,"mode":"normal","style":"","text":" on anything you\'ve missed.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"A little housekeeping: If this email landed in spam or promotions, try moving it to your primary inbox and adding this address to your contacts. Small signals like that help your inbox recognize that these messages matter to you.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Have questions or just want to say hi? Feel free to reply directly to this email or any newsletter in the future.","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

const EmailPreviewRow: React.FC<{
    automatedEmail: AutomatedEmail,
    emailType: 'free' | 'paid',
    icon: 'user-add' | 'bills',
    title: string,
    enabled: boolean,
    isBusy: boolean,
    isInitialLoading: boolean,
    onEdit: () => void,
    onToggle: () => void
}> = ({
    automatedEmail,
    emailType,
    icon,
    title,
    enabled,
    isBusy,
    isInitialLoading,
    onEdit,
    onToggle
}) => {
    return (
        <TableRow
            action={<div className={`flex items-center gap-7 ${isBusy && !isInitialLoading ? 'pointer-events-none' : ''}`}>
                {isInitialLoading ? (
                    <div className="h-4 w-7 rounded-full bg-grey-300 dark:bg-grey-800" />
                ) : (
                    <Toggle
                        checked={enabled}
                        onChange={onToggle}
                    />
                )}
                <button className='font-semibold text-green hover:opacity-80' type='button' onClick={onEdit}>
                    Edit
                </button>
            </div>}
            hideActions={false}
            testId={`${emailType}-welcome-email-row`}
        >
            <div className='w-full'>
                <button
                    className='flex w-full min-w-0 items-center gap-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-black'
                    data-testid={`${emailType}-welcome-email-preview`}
                    type='button'
                    onClick={onEdit}
                >
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-grey-100 dark:bg-grey-925'>
                        <Icon colorClass='text-grey-700 dark:text-grey-600' name={icon} size='md' />
                    </div>
                    <div className='min-w-0 grow'>
                        <div className='leading-tight font-medium' data-testid={`${emailType}-welcome-email-title`}>{title}</div>
                        <div className='mt-1 text-xs leading-[1.35] text-grey-700 dark:text-grey-600'>
                            {automatedEmail.subject}
                        </div>
                    </div>
                </button>
            </div>
        </TableRow>
    );
};

const MemberEmailsTable: React.FC<{
    settings: ReturnType<typeof useGlobalData>['settings'],
    config: ReturnType<typeof useGlobalData>['config'],
    freeEmailForDisplay: AutomatedEmail,
    paidEmailForDisplay: AutomatedEmail,
    freeWelcomeEmailEnabled: boolean,
    paidWelcomeEmailEnabled: boolean,
    isBusy: boolean,
    isLoading: boolean,
    onFreeEdit: () => void,
    onFreeToggle: () => void,
    onPaidEdit: () => void,
    onPaidToggle: () => void
}> = ({
    settings,
    config,
    freeEmailForDisplay,
    paidEmailForDisplay,
    freeWelcomeEmailEnabled,
    paidWelcomeEmailEnabled,
    isBusy,
    isLoading,
    onFreeEdit,
    onFreeToggle,
    onPaidEdit,
    onPaidToggle
}) => {
    return (
        <Table borderTop>
            <EmailPreviewRow
                automatedEmail={freeEmailForDisplay}
                emailType='free'
                enabled={freeWelcomeEmailEnabled}
                icon='user-add'
                isBusy={isBusy}
                isInitialLoading={isLoading}
                title='Free members welcome email'
                onEdit={onFreeEdit}
                onToggle={onFreeToggle}
            />
            {checkStripeEnabled(settings, config) && (
                <EmailPreviewRow
                    automatedEmail={paidEmailForDisplay}
                    emailType='paid'
                    enabled={paidWelcomeEmailEnabled}
                    icon='bills'
                    isBusy={isBusy}
                    isInitialLoading={isLoading}
                    title='Paid members welcome email'
                    onEdit={onPaidEdit}
                    onToggle={onPaidToggle}
                />
            )}
        </Table>
    );
};

const MemberEmails: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const hasDesignCustomization = useFeatureFlag('welcomeEmailsDesignCustomization');
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
    const customizeButton = hasDesignCustomization ? (
        <Button
            className='mt-[-5px]'
            color='clear'
            label='Customize'
            size='sm'
            onClick={() => NiceModal.show(WelcomeEmailCustomizeModal)}
        />
    ) : null;

    return (
        <TopLevelGroup
            customButtons={customizeButton}
            description="Create and manage automated emails for your members"
            keywords={keywords}
            navid='memberemails'
            testId='memberemails'
            title='Welcome emails'
        >
            <MemberEmailsTable
                config={config}
                freeEmailForDisplay={freeEmailForDisplay}
                freeWelcomeEmailEnabled={freeWelcomeEmailEnabled}
                isBusy={isBusy}
                isLoading={isLoading}
                paidEmailForDisplay={paidEmailForDisplay}
                paidWelcomeEmailEnabled={paidWelcomeEmailEnabled}
                settings={settings}
                onFreeEdit={() => handleEditClick('free')}
                onFreeToggle={() => handleToggle('free')}
                onPaidEdit={() => handleEditClick('paid')}
                onPaidToggle={() => handleToggle('paid')}
            />
        </TopLevelGroup>
    );
};

export default withErrorBoundary(MemberEmails, 'MemberEmails');
