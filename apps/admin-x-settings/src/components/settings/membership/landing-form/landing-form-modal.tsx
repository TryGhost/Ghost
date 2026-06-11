import * as customFields from '../../../../../../../poc/custom-fields/repo';
import AudiencePicker from './audience-picker';
import FormFieldsList from '../custom-fields/form-fields-list';
import LandingPreview from './landing-preview';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import {Button, ConfirmationModal, Form, PreviewModalContent, type Tab, TabView, TextArea, TextField} from '@tryghost/admin-x-design-system';

// POC Story 5.5: edit one landing form. Same PreviewModal two-pane layout as the
// Portal modal — live preview left, tabbed sidebar right. General = name +
// description + the field picker; Segmentation = the audience picker. Everything
// persists to the repo immediately, so Close/Save both just close.
const ALL = 'status:free,status:-free';

interface Props {
    formId: string;
}

const LandingFormModal: React.FC<Props> = ({formId}) => {
    const modal = useModal();
    const [selectedTab, setSelectedTab] = useState('general');
    const [meta, setMeta] = useState({name: '', description: '', audience: ALL});

    useEffect(() => {
        customFields.getLandingForm(formId).then((form) => {
            if (form) {
                setMeta({name: form.name, description: form.description || '', audience: form.audience});
            }
        });
    }, [formId]);

    const update = (patch: Partial<typeof meta>) => {
        setMeta(current => ({...current, ...patch}));
        customFields.updateLandingForm(formId, patch);
    };

    const confirmDelete = () => {
        NiceModal.show(ConfirmationModal, {
            title: 'Delete landing form',
            prompt: <>Deleting <strong>{meta.name}</strong> removes the form and stops it being shown to members. This can&rsquo;t be undone.</>,
            okLabel: 'Delete',
            okColor: 'red',
            onOk: async (deleteModal) => {
                await customFields.deleteLandingForm(formId);
                deleteModal?.remove();
                modal.remove();
            }
        });
    };

    const tabs: Tab[] = [
        {
            id: 'general',
            title: 'General',
            contents: (
                <div className='mt-7'><Form>
                    <TextField
                        maxLength={191}
                        placeholder='Paid members'
                        title='Name'
                        value={meta.name}
                        onChange={e => update({name: e.target.value})}
                    />
                    <TextArea
                        maxLength={2000}
                        title='Description'
                        value={meta.description}
                        onChange={e => update({description: e.target.value})}
                    />
                    <FormFieldsList formId={formId} />
                </Form></div>
            )
        },
        {
            id: 'segmentation',
            title: 'Segmentation',
            contents: (
                <div className='mt-7'>
                    <AudiencePicker audience={meta.audience} onChange={audience => update({audience})} />
                </div>
            )
        }
    ];

    const sidebar = (
        <div className='flex h-full flex-col pt-4'>
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
            <div className='mt-auto pt-6'>
                <Button color='red' label='Delete landing form' size='sm' link onClick={confirmDelete} />
            </div>
        </div>
    );

    return (
        <PreviewModalContent
            cancelLabel='Close'
            deviceSelector={false}
            okLabel='Save'
            preview={<LandingPreview formId={formId} />}
            previewBgColor='grey'
            previewToolbar={false}
            sidebar={sidebar}
            testId='landing-form-modal'
            title={meta.name || 'Landing form'}
            onOk={() => modal.remove()}
        />
    );
};

export default NiceModal.create(LandingFormModal);
