import DefaultRecipients from './default-recipients';
import EnableNewsletters from './enable-newsletters';
import MailGun from './mailgun';
import NewslettersTabContent, {type NewslettersFilter} from './newsletters/newsletters-tab-content';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import SearchableSection from '../../searchable-section';
import TopLevelGroup from '../../top-level-group';
import WelcomeEmailCustomizeModal from '../membership/member-emails/welcome-email-customize-modal';
import {Button, Icon, Table, TableRow} from '@tryghost/admin-x-design-system';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

export const searchKeywords = {
    enableNewsletters: ['emails', 'newsletters', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off'],
    emails: ['emails', 'newsletters', 'transactional', 'design', 'customization', 'automations', 'welcome'],
    defaultRecipients: ['newsletters', 'default recipients', 'emails'],
    mailgun: ['mailgun', 'emails', 'newsletters'],
    emailsNavMenu: ['emails', 'newsletters', 'transactional', 'newsletter sending', 'enable', 'disable', 'turn on', 'turn off', 'design', 'customization', 'default recipients', 'mailgun', 'automations', 'welcome']
};

const TransactionalTabContent: React.FC = () => {
    const openCustomizeModal = () => {
        NiceModal.show(WelcomeEmailCustomizeModal);
    };

    return (
        <Table>
            <TableRow
                action={<button className='font-semibold text-green hover:opacity-80' type='button' onClick={openCustomizeModal}>Edit</button>}
                hideActions={false}
                testId='automations-transactional-row'
            >
                <button
                    className='flex w-full min-w-0 items-center gap-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-black'
                    type='button'
                    onClick={openCustomizeModal}
                >
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-grey-100 dark:bg-grey-900'>
                        <Icon colorClass='text-grey-700 dark:text-grey-600' name='mailplus' size='md' />
                    </div>
                    <div className='min-w-0 grow'>
                        <div className='leading-tight font-medium'>Automations</div>
                        <div className='mt-1 text-sm leading-[1.35] text-grey-700 dark:text-grey-600'>
                            Design for automation emails
                        </div>
                    </div>
                </button>
            </TableRow>
        </Table>
    );
};

const EmailsGroup: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const [selectedTab, setSelectedTab] = useState<'newsletters' | 'transactional'>('newsletters');
    const [newslettersFilter, setNewslettersFilter] = useState<NewslettersFilter>('active');

    const openNewNewsletter = () => {
        updateRoute('newsletters/new');
    };

    const customButtons = selectedTab === 'newsletters' ? (
        <Button className='mt-[-5px]' color='clear' label='Add newsletter' size='sm' onClick={openNewNewsletter} />
    ) : undefined;

    return (
        <TopLevelGroup
            customButtons={customButtons}
            description='Edit details and customize email design'
            keywords={keywords}
            navid='emails'
            testId='emails'
            title='Emails'
        >
            <Tabs value={selectedTab} variant='underline' onValueChange={value => setSelectedTab(value as 'newsletters' | 'transactional')}>
                <div className='flex items-center justify-between border-b border-grey-200 dark:border-grey-900'>
                    <TabsList className='border-b-0'>
                        <TabsTrigger value='newsletters'>Newsletters</TabsTrigger>
                        <TabsTrigger value='transactional'>Transactional</TabsTrigger>
                    </TabsList>
                    {selectedTab === 'newsletters' && (
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
                <TabsContent value='newsletters'>
                    <NewslettersTabContent filter={newslettersFilter} />
                </TabsContent>
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

    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Emails'>
            <EnableNewsletters keywords={searchKeywords.enableNewsletters} />
            {newslettersEnabled !== 'disabled' && <DefaultRecipients keywords={searchKeywords.defaultRecipients} />}
            <EmailsGroup keywords={searchKeywords.emails} />
            {newslettersEnabled !== 'disabled' && !config.mailgunIsConfigured && <MailGun keywords={searchKeywords.mailgun} />}
        </SearchableSection>
    );
};

export default Emails;
