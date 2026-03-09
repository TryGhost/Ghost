import CampaignActivityModal from './member-emails/campaign-activity-modal';
import CampaignBuilderModal from './member-emails/campaign-builder-modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, Separator, SettingGroupContent, Toggle, showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useBrowseAutomatedEmails, useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

const CampaignSection: React.FC<{
    campaignType: string;
    description: string;
    emails: AutomatedEmail[];
    title: string;
}> = ({campaignType, description, emails, title}) => {
    const steps = emails.filter(e => e.campaign_type === campaignType);
    const stepCount = steps.length;
    const enabled = steps.some(e => e.status === 'active');
    const {mutateAsync: editAutomatedEmail, isLoading: isEditing} = useEditAutomatedEmail();
    const handleError = useHandleError();

    const handleEdit = () => {
        NiceModal.show(CampaignBuilderModal, {campaignType, title});
    };

    const handleToggle = async () => {
        if (isEditing) {
            return;
        }
        const newStatus = enabled ? 'inactive' : 'active';
        try {
            await Promise.all(
                steps.map(step => editAutomatedEmail({...step, status: newStatus}))
            );
            showToast({type: 'success', title: `Campaign ${newStatus === 'active' ? 'enabled' : 'disabled'}`});
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <div className='flex items-center gap-4 py-4'>
            <div className='min-w-0 grow'>
                <div className='flex items-center gap-2'>
                    <span className='font-medium'>{title}</span>
                    {stepCount > 0 && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${enabled ? 'text-green-700 dark:bg-green-900/30 bg-green-100 dark:text-green-400' : 'bg-grey-150 text-grey-700 dark:bg-grey-900 dark:text-grey-500'}`}>
                            {stepCount} {stepCount === 1 ? 'step' : 'steps'}
                        </span>
                    )}
                </div>
                <div className='text-sm text-grey-700 dark:text-grey-600'>
                    {description}
                </div>
            </div>
            <div className='flex items-center gap-3'>
                <Toggle
                    checked={enabled}
                    disabled={isEditing || stepCount === 0}
                    onChange={handleToggle}
                />
                <Button
                    color='clear'
                    label='Edit'
                    size='sm'
                    onClick={handleEdit}
                />
            </div>
        </div>
    );
};

const MemberEmails: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {data: automatedEmailsData, isLoading} = useBrowseAutomatedEmails();

    const automatedEmails = automatedEmailsData?.automated_emails || [];

    if (isLoading) {
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
                    <div className='py-4 text-sm text-grey-700'>Loading...</div>
                </SettingGroupContent>
            </TopLevelGroup>
        );
    }

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
                    title='Free member signup'
                />
                <Separator />
                <CampaignSection
                    campaignType='paid_signup'
                    description='Automated emails sent to new paid members after they subscribe.'
                    emails={automatedEmails}
                    title='Paid member signup'
                />
                <div className='mt-6 flex justify-end'>
                    <Button
                        color='clear'
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
