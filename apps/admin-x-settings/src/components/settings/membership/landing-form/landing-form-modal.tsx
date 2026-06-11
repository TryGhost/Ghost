import FormFieldsList from '../custom-fields/form-fields-list';
import LandingPreview from './landing-preview';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {Form, PreviewModalContent, type Tab, TabView} from '@tryghost/admin-x-design-system';

// POC: same PreviewModal pattern as the Portal modal — live preview on the left,
// the sidebar tabbed like Portal (no intro copy; Portal/Announcement modals don't
// show descriptions either). General holds the field picker; Segmentation is the
// placeholder for Story 5.5's audience targeting. FormFieldsList persists to the
// repo immediately, so Close/Save both just close.
const LandingFormModal: React.FC = () => {
    const modal = useModal();
    const [selectedTab, setSelectedTab] = useState('general');

    const tabs: Tab[] = [
        {
            id: 'general',
            title: 'General',
            contents: (
                <div className='mt-7'><Form>
                    <FormFieldsList surface='landing' />
                </Form></div>
            )
        },
        {
            id: 'segmentation',
            title: 'Segmentation',
            contents: (
                <p className='mt-7 text-grey-700'>
                    Target this form at a specific audience (by tier, label, or signup date). Coming soon.
                </p>
            )
        }
    ];

    const sidebar = (
        <div className='pt-4'>
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </div>
    );

    return (
        <PreviewModalContent
            cancelLabel='Close'
            deviceSelector={false}
            okLabel='Save'
            preview={<LandingPreview />}
            previewBgColor='grey'
            previewToolbar={false}
            sidebar={sidebar}
            testId='landing-form-modal'
            title='Landing form'
            onOk={() => modal.remove()}
        />
    );
};

export default NiceModal.create(LandingFormModal);
