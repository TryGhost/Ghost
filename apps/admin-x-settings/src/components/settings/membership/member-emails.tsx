import CampaignActivityModal from './member-emails/campaign-activity-modal';
import CampaignSteps from './member-emails/campaign-steps';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, Icon, Separator, SettingGroupContent, Toggle, showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseAutomatedEmails, useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

const CampaignSection: React.FC<{
    campaignType: string;
    description: string;
    emails: AutomatedEmail[];
    enabled: boolean;
    isLoading: boolean;
    title: string;
    onToggle: () => void;
}> = ({campaignType, description, emails, enabled, isLoading, title, onToggle}) => {
    const [expanded, setExpanded] = useState(true);
    const steps = emails.filter(e => e.campaign_type === campaignType);
    const stepCount = steps.length;

    return (
        <div>
            <div className='flex items-center gap-4 py-4'>
                <div className='flex min-w-0 grow items-center gap-2'>
                    <button
                        className='flex shrink-0 cursor-pointer items-center'
                        type='button'
                        onClick={() => setExpanded(!expanded)}
                    >
                        <Icon className={`transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} name='chevron-down' size='xs' />
                    </button>
                    <button
                        className='min-w-0 cursor-pointer text-left'
                        type='button'
                        onClick={() => setExpanded(!expanded)}
                    >
                        <div className='font-medium'>{title}</div>
                        <div className='text-sm text-grey-700 dark:text-grey-600'>
                            {description}
                            {!expanded && stepCount > 0 && (
                                <span className='ml-1'>({stepCount} {stepCount === 1 ? 'step' : 'steps'})</span>
                            )}
                        </div>
                    </button>
                </div>
                <div className='shrink-0 rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green'>
                    {isLoading ? (
                        <div className="h-4 w-7 rounded-full bg-grey-300 dark:bg-grey-800" />
                    ) : (
                        <Toggle
                            checked={enabled}
                            onChange={onToggle}
                        />
                    )}
                </div>
            </div>
            {expanded && (
                <CampaignSteps
                    campaignType={campaignType}
                    emails={emails}
                />
            )}
        </div>
    );
};

const MemberEmails: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings, config} = useGlobalData();

    const {data: automatedEmailsData, isLoading} = useBrowseAutomatedEmails();
    const {mutateAsync: editAutomatedEmail, isLoading: isEditingAutomatedEmail} = useEditAutomatedEmail();
    const handleError = useHandleError();

    const automatedEmails = automatedEmailsData?.automated_emails || [];
    const isBusy = isLoading || isEditingAutomatedEmail;

    const freeCampaignEnabled = automatedEmails.some(e => e.campaign_type === 'free_signup' && e.status === 'active');
    const paidCampaignEnabled = automatedEmails.some(e => e.campaign_type === 'paid_signup' && e.status === 'active');

    const handleToggleCampaign = async (campaignType: string) => {
        if (isBusy) {
            return;
        }

        const steps = automatedEmails.filter(e => e.campaign_type === campaignType);
        const isEnabled = steps.some(e => e.status === 'active');
        const newStatus = isEnabled ? 'inactive' : 'active';
        const label = campaignType === 'free_signup' ? 'Free member signup' : 'Paid member signup';

        try {
            await Promise.all(
                steps.map(step => editAutomatedEmail({...step, status: newStatus}))
            );
            showToast({type: 'success', title: `${label} campaign ${newStatus === 'active' ? 'enabled' : 'disabled'}`});
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <TopLevelGroup
            description="Create and manage automated email campaigns for your members"
            keywords={keywords}
            navid='memberemails'
            testId='memberemails'
            title='Campaigns'
        >
            <SettingGroupContent className="!gap-y-0" columns={1}>
                <Separator />
                <CampaignSection
                    campaignType='free_signup'
                    description='Automated emails sent to new free members after they sign up.'
                    emails={automatedEmails}
                    enabled={freeCampaignEnabled}
                    isLoading={isLoading}
                    title='Free member signup'
                    onToggle={() => handleToggleCampaign('free_signup')}
                />
                {checkStripeEnabled(settings, config) && (
                    <>
                        <Separator />
                        <CampaignSection
                            campaignType='paid_signup'
                            description='Automated emails sent to new paid members after they subscribe.'
                            emails={automatedEmails}
                            enabled={paidCampaignEnabled}
                            isLoading={isLoading}
                            title='Paid member signup'
                            onToggle={() => handleToggleCampaign('paid_signup')}
                        />
                    </>
                )}
                <div className='mt-6 flex justify-end'>
                    <Button
                        color='outline'
                        label='View campaign activity'
                        size='sm'
                        onClick={() => NiceModal.show(CampaignActivityModal)}
                    />
                </div>
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(MemberEmails, 'MemberEmails');
