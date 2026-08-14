import ConfirmationModal from '../../confirmation-modal';
import DefaultRecipients from './default-recipients';
import EnableNewsletters from './enable-newsletters';
import MailGun from './mailgun';
import NewslettersTabContent, {type NewslettersFilter} from './newsletters/newsletters-tab-content';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useRef, useState} from 'react';
import SearchableSection from '../../searchable-section';
import TopLevelGroup from '../../top-level-group';
import WelcomeEmailCustomizeModal from '../membership/member-emails/welcome-email-customize-modal';
import useQueryParams from '../../../hooks/use-query-params';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useVerifyAutomatedEmailSender} from '@tryghost/admin-x-framework/api/automated-emails';

export const searchKeywords = {
    enableNewsletters: ['emails', 'newsletters', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off'],
    emails: ['emails', 'newsletters', 'automation emails', 'transactional', 'design', 'customization', 'automations', 'welcome'],
    defaultRecipients: ['newsletters', 'default recipients', 'emails'],
    mailgun: ['mailgun', 'emails', 'newsletters']
};

const TransactionalTabContent: React.FC = () => {
    const openCustomizeModal = () => {
        NiceModal.show(WelcomeEmailCustomizeModal);
    };

    return (
        <ActionList>
            <ActionListItem data-testid='automations-transactional-row'>
                <ActionListItemContent asChild>
                <button
                    className='flex w-full min-w-0 items-center gap-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none'
                    type='button'
                    onClick={openCustomizeModal}
                >
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-muted'>
                        <LucideIcon.MailPlus className='size-5 text-muted-foreground' />
                    </span>
                    <span className='min-w-0 grow'>
                        <span className='block leading-tight font-medium'>Email design</span>
                        <span className='mt-1 block text-sm leading-[1.35] text-muted-foreground'>
                            Customize the appearance of automation emails
                        </span>
                    </span>
                </button>
                </ActionListItemContent>
                <ActionListItemActions><Button className='h-auto p-0 font-bold text-green hover:text-green/90 hover:no-underline' type='button' variant='link' onClick={openCustomizeModal}>Edit</Button></ActionListItemActions>
            </ActionListItem>
        </ActionList>
    );
};

const isAutomatedEmailVerificationRoute = () => {
    const hash = window.location.hash.slice(1);
    const pathname = new URL(hash || '/', window.location.origin).pathname;

    return pathname.startsWith('/settings/memberemails');
};

const EmailsGroup: React.FC<{ keywords: string[]; newslettersEnabled: boolean }> = ({keywords, newslettersEnabled}) => {
    const {updateRoute} = useRouting();
    const verifyEmailToken = useQueryParams().getParam('verifyEmail');
    const {mutateAsync: verifySenderUpdate} = useVerifyAutomatedEmailSender();
    const handleError = useHandleError();
    const submittedTokenRef = useRef<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<'newsletters' | 'transactional'>(newslettersEnabled ? 'newsletters' : 'transactional');
    const [newslettersFilter, setNewslettersFilter] = useState<NewslettersFilter>('active');

    useEffect(() => {
        if (!newslettersEnabled && selectedTab === 'newsletters') {
            setSelectedTab('transactional');
        }
    }, [newslettersEnabled, selectedTab]);

    useEffect(() => {
        if (!verifyEmailToken || !isAutomatedEmailVerificationRoute()) {
            return;
        }

        if (submittedTokenRef.current === verifyEmailToken) {
            return;
        }
        submittedTokenRef.current = verifyEmailToken;
        setSelectedTab('transactional');

        const verify = async () => {
            try {
                const {meta: {email_verified: emailVerified} = {}} = await verifySenderUpdate({token: verifyEmailToken});

                let title = 'Sender email verified';
                let prompt = <>Automation email sender settings have been updated.</>;

                if (emailVerified === 'sender_reply_to') {
                    title = 'Reply-to address verified';
                    prompt = <>Automation email reply-to address has been verified and updated.</>;
                }

                updateRoute('emails');
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

                updateRoute('emails');
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
    }, [handleError, updateRoute, verifyEmailToken, verifySenderUpdate]);

    const openNewNewsletter = () => {
        updateRoute('newsletters/new');
    };

    const customButtons = newslettersEnabled && selectedTab === 'newsletters' ? (
        <Button className='mt-[-5px]' size='sm' type='button' variant='ghost' onClick={openNewNewsletter}>Add newsletter</Button>
    ) : undefined;

    return (
        <TopLevelGroup
            customButtons={customButtons}
            description='Manage newsletters and design automation emails.'
            keywords={keywords}
            navid='emails'
            testId='emails'
            title='Newsletters & automation emails'
        >
            <Tabs value={selectedTab} variant='underline' onValueChange={value => setSelectedTab(value as 'newsletters' | 'transactional')}>
                <div className='flex items-center justify-between border-b border-grey-200 dark:border-grey-900'>
                    <TabsList className='border-b-0'>
                        {newslettersEnabled && <TabsTrigger value='newsletters'>Newsletters</TabsTrigger>}
                        <TabsTrigger value='transactional'>Automation emails</TabsTrigger>
                    </TabsList>
                    {newslettersEnabled && selectedTab === 'newsletters' && (
                        <Select value={newslettersFilter} onValueChange={value => setNewslettersFilter(value as NewslettersFilter)}>
                            <SelectTrigger className='h-7 w-auto gap-1 border-0 bg-transparent px-2 text-sm shadow-none hover:bg-muted focus:ring-0 focus:ring-offset-0' data-testid='newsletters-filter'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='active'>Active</SelectItem>
                                <SelectItem value='archived'>Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>
                {newslettersEnabled && (
                    <TabsContent value='newsletters'>
                        <NewslettersTabContent filter={newslettersFilter} />
                    </TabsContent>
                )}
                <TabsContent value='transactional'>
                    <TransactionalTabContent />
                </TabsContent>
            </Tabs>
        </TopLevelGroup>
    );
};

const Emails: React.FC = () => {
    const {settings, config} = useGlobalData();
    const [newslettersEnabled] = getSettingValues(settings, ['editor_default_email_recipients']) as [string];
    const hasNewslettersEnabled = newslettersEnabled !== 'disabled';
    const hasMailgun = hasNewslettersEnabled && !config.mailgunIsConfigured;
    const visibleSearchKeywords = [
        searchKeywords.enableNewsletters,
        ...(hasNewslettersEnabled ? [searchKeywords.defaultRecipients] : []),
        searchKeywords.emails,
        ...(hasMailgun ? [searchKeywords.mailgun] : [])
    ].flat();

    return (
        <SearchableSection keywords={visibleSearchKeywords} title='Email'>
            <EnableNewsletters keywords={searchKeywords.enableNewsletters} />
            {hasNewslettersEnabled && <DefaultRecipients keywords={searchKeywords.defaultRecipients} />}
            <EmailsGroup keywords={searchKeywords.emails} newslettersEnabled={hasNewslettersEnabled} />
            {hasMailgun && <MailGun keywords={searchKeywords.mailgun} />}
        </SearchableSection>
    );
};

export default Emails;
