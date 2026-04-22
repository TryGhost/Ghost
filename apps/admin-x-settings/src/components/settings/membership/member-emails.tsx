import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef} from 'react';
import TopLevelGroup from '../../top-level-group';
import WelcomeEmailCustomizeModal from './member-emails/welcome-email-customize-modal';
import WelcomeEmailModal from './member-emails/welcome-email-modal';
import useQueryParams from '../../../hooks/use-query-params';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Button, ConfirmationModal, Icon, Table, TableRow, Toggle, showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {WELCOME_EMAIL_SLUGS, type WelcomeEmailType, getDefaultWelcomeEmailRecord, getDefaultWelcomeEmailValues} from './member-emails/default-welcome-email-values';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useAddAutomatedEmail, useBrowseAutomatedEmails, useEditAutomatedEmail, useVerifyAutomatedEmailSender} from '@tryghost/admin-x-framework/api/automated-emails';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

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
    const {settings, config} = useGlobalData();
    const [siteTitle] = getSettingValues<string>(settings, ['title']);
    const verifyEmailToken = useQueryParams().getParam('verifyEmail');

    const {data: automatedEmailsData, isLoading} = useBrowseAutomatedEmails();
    const {mutateAsync: addAutomatedEmail, isLoading: isAddingAutomatedEmail} = useAddAutomatedEmail();
    const {mutateAsync: editAutomatedEmail, isLoading: isEditingAutomatedEmail} = useEditAutomatedEmail();
    const {mutateAsync: verifySenderUpdate} = useVerifyAutomatedEmailSender();
    const handleError = useHandleError();

    const automatedEmails = automatedEmailsData?.automated_emails || [];
    const isMutating = isAddingAutomatedEmail || isEditingAutomatedEmail;
    const isBusy = isLoading || isMutating;

    const freeWelcomeEmail = automatedEmails.find(email => email.slug === WELCOME_EMAIL_SLUGS.free);
    const paidWelcomeEmail = automatedEmails.find(email => email.slug === WELCOME_EMAIL_SLUGS.paid);

    const freeWelcomeEmailEnabled = freeWelcomeEmail?.status === 'active';
    const paidWelcomeEmailEnabled = paidWelcomeEmail?.status === 'active';

    // Create a new automated email row with the given status
    const createAutomatedEmail = async (emailType: WelcomeEmailType, status: 'active' | 'inactive') => {
        const defaults = getDefaultWelcomeEmailValues(emailType, siteTitle);
        return addAutomatedEmail({...defaults, status});
    };

    const submittedTokenRef = useRef<string | null>(null);

    useEffect(() => {
        if (!verifyEmailToken || !window.location.href.includes('memberemails')) {
            return;
        }

        if (submittedTokenRef.current === verifyEmailToken) {
            return;
        }
        submittedTokenRef.current = verifyEmailToken;

        const clearVerifyEmailFromRoute = () => {
            const hash = window.location.hash.slice(1);
            const url = new URL(hash || '/memberemails', window.location.origin);
            url.searchParams.delete('verifyEmail');

            const nextHash = url.search ? `#${url.pathname}${url.search}` : `#${url.pathname}`;
            window.history.replaceState(null, '', `${window.location.pathname}${nextHash}`);
        };

        const verify = async () => {
            try {
                const {meta: {email_verified: emailVerified} = {}} = await verifySenderUpdate({token: verifyEmailToken});
                clearVerifyEmailFromRoute();

                let title = 'Sender email verified';
                let prompt = <>Welcome email sender settings have been updated.</>;

                if (emailVerified === 'sender_reply_to') {
                    title = 'Reply-to address verified';
                    prompt = <>Welcome email reply-to address has been verified and updated.</>;
                }

                NiceModal.show(ConfirmationModal, {
                    title,
                    prompt,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
            } catch (e) {
                let prompt = 'There was an error verifying your email address. Try again later.';

                if (e instanceof APIError && e.message === 'Token expired') {
                    prompt = 'Verification link has expired.';
                }

                clearVerifyEmailFromRoute();

                NiceModal.show(ConfirmationModal, {
                    title: 'Error verifying email address',
                    prompt,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
                handleError(e, {withToast: false});
            }
        };

        verify();
    }, [handleError, verifyEmailToken, verifySenderUpdate]);

    const handleToggle = async (emailType: 'free' | 'paid') => {
        const existing = automatedEmails.find(email => email.slug === WELCOME_EMAIL_SLUGS[emailType]);
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
        const existing = automatedEmails.find(email => email.slug === WELCOME_EMAIL_SLUGS[emailType]);

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
    const freeEmailForDisplay = freeWelcomeEmail || getDefaultWelcomeEmailRecord('free', siteTitle);
    const paidEmailForDisplay = paidWelcomeEmail || getDefaultWelcomeEmailRecord('paid', siteTitle);

    return (
        <TopLevelGroup
            customButtons={(
                <Button
                    className='mt-[-5px]'
                    color='clear'
                    label='Customize'
                    size='sm'
                    onClick={() => NiceModal.show(WelcomeEmailCustomizeModal)}
                />
            )}
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
