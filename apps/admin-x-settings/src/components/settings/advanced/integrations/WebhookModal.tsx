import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import Select from '../../../../admin-x-ds/global/form/Select';
import TextField from '../../../../admin-x-ds/global/form/TextField';

interface WebhookModalProps {}

const WebhookModal: React.FC<WebhookModalProps> = () => {
    return <Modal
        okColor='black'
        okLabel='Add'
        size='sm'
        testId='webhook-modal'
        title='Add webhook'
        formSheet
        onOk={async () => {}}
    >
        <div className='mt-5'>
            <Form
                marginBottom={false}
                marginTop={false}
            >
                <TextField
                    placeholder='Custom webhook'
                    title='Name'
                />
                <Select
                    options={[
                        {
                            label: 'Global',
                            options: [{label: 'Site changed', value: ''}]
                        },
                        {
                            label: 'Posts',
                            options: [
                                {label: 'Post created', value: ''},
                                {label: 'Post deleted', value: ''},
                                {label: 'Post updated', value: ''},
                                {label: 'Post published', value: ''},
                                {label: 'Published post updated', value: ''},
                                {label: 'Post unpublished', value: ''},
                                {label: 'Post scheduled', value: ''},
                                {label: 'Post unscheduled', value: ''},
                                {label: 'Tag added to post', value: ''},
                                {label: 'Tag removed from post', value: ''}
                            ]
                        },
                        {
                            label: 'Pages',
                            options: [
                                {label: 'Page created', value: ''},
                                {label: 'Page deleted', value: ''},
                                {label: 'Page updated', value: ''},
                                {label: 'Page published', value: ''},
                                {label: 'Published page updated', value: ''},
                                {label: 'Page unpublished', value: ''},
                                {label: 'Tag added to page', value: ''},
                                {label: 'Tag removed from page', value: ''}
                            ]
                        },
                        {
                            label: 'Tags',
                            options: [
                                {label: 'Tag created', value: ''},
                                {label: 'Tag deleted', value: ''},
                                {label: 'Tag updated', value: ''}
                            ]
                        },
                        {
                            label: 'Members',
                            options: [
                                {label: 'Members created', value: ''},
                                {label: 'Members deleted', value: ''},
                                {label: 'Members updated', value: ''}
                            ]
                        }
                    ]}
                    prompt='Select an event'
                    onSelect={() => {}}
                />
                <TextField
                    placeholder='https://example.com'
                    title='Target URL'
                />
                <TextField
                    placeholder='Psst...'
                    title='Secret'
                />
            </Form>
        </div>
    </Modal>;
};

export default NiceModal.create(WebhookModal);
