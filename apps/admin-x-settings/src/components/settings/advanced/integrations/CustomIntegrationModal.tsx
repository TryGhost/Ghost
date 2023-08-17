import APIKeys from './APIKeys';
import Form from '../../../../admin-x-ds/global/form/Form';
import ImageUpload from '../../../../admin-x-ds/global/form/ImageUpload';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import useRouting from '../../../../hooks/useRouting';
import {getGhostPaths} from '../../../../utils/helpers';

interface CustomIntegrationModalProps {}

const CustomIntegrationModal: React.FC<CustomIntegrationModalProps> = () => {
    // const modal = useModal();
    const {updateRoute} = useRouting();

    const integrationTitle = 'A custom integration';
    const regenerated = false;

    return <Modal
        afterClose={() => {
            updateRoute('integrations');
        }}
        okColor='black'
        okLabel='Save & close'
        size='md'
        testId='custom-integration-modal'
        title={integrationTitle}
        onOk={async () => {}}
    >
        <div className='mt-5 flex w-full gap-7'>
            <div>
                <ImageUpload
                    height='120px'
                    id='custom-integration-icon'
                    width='120px'
                    onDelete={() => {}}
                    onImageClick={() => {}}
                    onUpload={() => {}}
                >
                    Upload icon
                </ImageUpload>
            </div>
            <div className='flex grow flex-col'>
                <Form>
                    <TextField title='Title' />
                    <TextField title='Detail' />
                    <div>
                        <APIKeys keys={[
                            {
                                label: 'Content API key',
                                text: '[content key here]',
                                hint: regenerated ? <div className='text-green'>Content API Key was successfully regenerated</div> : undefined
                            // onRegenerate: handleRegenerate
                            },
                            {
                                label: 'Admin API key',
                                text: '[api key here]',
                                hint: regenerated ? <div className='text-green'>Admin API Key was successfully regenerated</div> : undefined
                            // onRegenerate: handleRegenerate
                            },
                            {
                                label: 'API URL',
                                text: window.location.origin + getGhostPaths().subdir
                            }
                        ]} />
                    </div>
                </Form>
            </div>
        </div>

        <div>
            Webhooks
        </div>

    </Modal>;
};

export default NiceModal.create(CustomIntegrationModal);
