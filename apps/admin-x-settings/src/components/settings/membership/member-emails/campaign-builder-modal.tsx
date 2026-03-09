import CampaignFlow from './campaign-flow/campaign-flow';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {Modal, Toggle, showToast} from '@tryghost/admin-x-design-system';
import {useBrowseAutomatedEmails, useEditAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

import {
    Button,
    cn
} from '@tryghost/shade';

interface CampaignBuilderModalProps {
    campaignType: string;
    title: string;
}

const CampaignBuilderModal: React.FC<CampaignBuilderModalProps> = ({campaignType, title}) => {
    const modal = useModal();
    const {data: automatedEmailsData} = useBrowseAutomatedEmails();
    const {mutateAsync: editAutomatedEmail, isLoading: isEditing} = useEditAutomatedEmail();
    const handleError = useHandleError();

    const emails = automatedEmailsData?.automated_emails || [];
    const steps = emails.filter(e => e.campaign_type === campaignType);
    const enabled = steps.some(e => e.status === 'active');

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
        <Modal
            backDropClick={false}
            footer={false}
            header={false}
            padding={false}
            scrolling={false}
            size='full'
            width='full'
        >
            <div
                className={cn(
                    'flex h-full w-full flex-col gap-0 overflow-hidden rounded-xl bg-gray-100 p-0',
                    'dark:bg-gray-975'
                )}
            >
                <div className='border-gray-200 dark:border-gray-900 dark:bg-gray-975 sticky top-0 flex shrink-0 items-center justify-between border-b bg-white px-5 py-3'>
                    <h3 className='text-xl font-semibold'>
                        {title}
                    </h3>
                    <div className='flex items-center gap-3'>
                        <Toggle
                            checked={enabled}
                            disabled={isEditing}
                            onChange={handleToggle}
                        />
                        <Button variant='outline' onClick={() => modal.remove()}>Close</Button>
                    </div>
                </div>
                <div className='flex min-h-0 grow flex-col overflow-y-auto p-6'>
                    <div className='border-gray-200 dark:border-gray-900 dark:bg-gray-950 mx-auto w-full max-w-[640px] grow rounded-lg border bg-white p-6 shadow-sm dark:shadow-none'>
                        <CampaignFlow
                            campaignType={campaignType}
                            emails={emails}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(CampaignBuilderModal);
