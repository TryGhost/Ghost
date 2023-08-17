import Button from '../../../../admin-x-ds/global/Button';
import Form from '../../../../admin-x-ds/global/form/Form';
import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import useRouting from '../../../../hooks/useRouting';
import {ReactComponent as Icon} from '../../../../assets/icons/slack.svg';

const SlackModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = NiceModal.useModal();

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            okColor='black'
            okLabel='Save & close'
            title=''
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='A messaging app for teams'
                icon={<Icon className='h-14 w-14' />}
                title='Slack'
            />
            <div className='mt-7'>
                <Form marginBottom={false} title='Slack configuration' grouped>
                    <TextField
                        hint={<>
                            Automatically send newly published posts to a channel in Slack or any Slack-compatible service like Discord or Mattermost. Set up a new incoming webhook here <strong className='text-red'>[&larr; link to be set]</strong>, and grab the URL.
                        </>}
                        placeholder='https://hooks.slack.com/services/...'
                        title='Webhook URL'
                    />
                    <div className='flex w-full items-center gap-2'>
                        <TextField
                            containerClassName='flex-grow'
                            hint='The username to display messages from'
                            title='Username'
                        />
                        <Button color='outline' label='Send test notification' />
                    </div>
                </Form>
            </div>
        </Modal>
    );
});

export default SlackModal;