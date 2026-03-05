import AddStepModal from './add-step-modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import WelcomeEmailModal from './welcome-email-modal';
import {Button, showToast} from '@tryghost/admin-x-design-system';
import {useDeleteAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {AutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';

interface CampaignStepsProps {
    campaignType: string;
    emails: AutomatedEmail[];
}

const formatDelay = (delayDays: number | null, index: number) => {
    if (delayDays === null || delayDays === 0) {
        return 'Sent immediately on signup';
    }
    const label = delayDays === 1 ? '1 day' : `${delayDays} days`;
    return `${label} after ${index === 0 ? 'signup' : 'previous step'}`;
};

const CampaignSteps: React.FC<CampaignStepsProps> = ({campaignType, emails}) => {
    const {mutateAsync: deleteAutomatedEmail} = useDeleteAutomatedEmail();
    const handleError = useHandleError();

    const steps = emails
        .filter(e => e.campaign_type === campaignType)
        .sort((a, b) => a.sort_order - b.sort_order);

    const nextSortOrder = steps.length > 0
        ? Math.max(...steps.map(s => s.sort_order)) + 1
        : 0;

    const handleAddStep = () => {
        NiceModal.show(AddStepModal, {campaignType, nextSortOrder});
    };

    const handleEditStep = (step: AutomatedEmail) => {
        NiceModal.show(WelcomeEmailModal, {emailType: campaignType === 'paid_signup' ? 'paid' : 'free', automatedEmail: step});
    };

    const handleDeleteStep = async (step: AutomatedEmail) => {
        try {
            await deleteAutomatedEmail(step.id);
            showToast({type: 'success', title: 'Campaign step deleted'});
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <div className='mt-1'>
            {steps.length > 0 && (
                <div className='mb-2 space-y-2'>
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className='flex items-center justify-between rounded-lg border border-grey-100 bg-white px-4 py-3 dark:border-grey-925 dark:bg-grey-975'
                        >
                            <div className='min-w-0'>
                                <div className='text-sm font-semibold'>
                                    {step.name}
                                </div>
                                <div className='text-xs text-grey-700 dark:text-grey-600'>
                                    {formatDelay(step.delay_days, index)} &middot; {step.subject}
                                </div>
                            </div>
                            <div className='flex shrink-0 items-center gap-1'>
                                <Button
                                    color='clear'
                                    label='Edit'
                                    size='sm'
                                    onClick={() => handleEditStep(step)}
                                />
                                <Button
                                    color='clear'
                                    label='Delete'
                                    size='sm'
                                    onClick={() => handleDeleteStep(step)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <button
                className='mt-1 cursor-pointer text-sm font-semibold text-green hover:text-green-500'
                type='button'
                onClick={handleAddStep}
            >
                + Add step
            </button>
        </div>
    );
};

export default CampaignSteps;
