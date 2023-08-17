import APIKeys from './APIKeys';
import Button from '../../../../admin-x-ds/global/Button';
import Form from '../../../../admin-x-ds/global/form/Form';
import ImageUpload from '../../../../admin-x-ds/global/form/ImageUpload';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableHead from '../../../../admin-x-ds/global/TableHead';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import WebhookModal from './WebhookModal';
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
        stickyFooter
        onOk={async () => {}}
    >
        <div className='mt-7 flex w-full gap-7'>
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
                    <TextField title='Description' />
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
            <Table>
                <TableRow bgOnHover={false}>
                    <TableHead>1 webhook</TableHead>
                    <TableHead>Last triggered</TableHead>
                    <TableHead />
                </TableRow>
                <TableRow
                    action={
                        <Button color='red' label='Delete' link onClick={() => {}} />
                    }
                    hideActions
                    onClick={() => {
                        NiceModal.show(WebhookModal);
                    }}
                >
                    <TableCell className='w-1/2'>
                        <div className='text-sm font-semibold'>Rebuild on post published</div>
                        <div className='grid grid-cols-[max-content_1fr] gap-x-1 text-xs leading-snug'>
                            <span className='text-grey-600'>Event:</span>
                            <span>Post published</span>
                            <span className='text-grey-600'>URL:</span>
                            <span>https://example.com</span>
                        </div>
                    </TableCell>
                    <TableCell className='w-1/2 text-sm'>
                        Tue Aug 15 2023 13:03:33
                    </TableCell>
                </TableRow>
                <TableRow bgOnHover={false} separator={false}>
                    <TableCell colSpan={3}>
                        <Button
                            color='green'
                            icon='add'
                            iconColorClass='text-green'
                            label='Add webhook'
                            size='sm'
                            link
                            onClick={() => {
                                NiceModal.show(WebhookModal);
                            }} />
                    </TableCell>
                </TableRow>
            </Table>
        </div>

    </Modal>;
};

export default NiceModal.create(CustomIntegrationModal);
