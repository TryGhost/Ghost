import Button from '../../../../admin-x-ds/global/Button';
import Form from '../../../../admin-x-ds/global/form/Form';
import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import toast from 'react-hot-toast';
import useRouting from '../../../../hooks/useRouting';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import validator from 'validator';
import {ReactComponent as Icon} from '../../../../assets/icons/slack.svg';
import {getSettingValues} from '../../../../api/settings';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {useTestSlack} from '../../../../api/slack';

const SlackModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = NiceModal.useModal();

    const {localSettings, updateSetting, handleSave, validate, errors, clearError} = useSettingGroup({
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (slackUrl && !validator.isURL(slackUrl, {require_protocol: true})) {
                newErrors.slackUrl = 'The URL must be in a format like https://hooks.slack.com/services/<your personal key>';
            }

            return newErrors;
        }
    });
    const [slackUrl, slackUsername] = getSettingValues<string>(localSettings, ['slack_url', 'slack_username']);

    const {mutateAsync: testSlack} = useTestSlack();

    const handleTestClick = async () => {
        toast.remove();
        if (await handleSave()) {
            await testSlack(null);
            showToast({
                message: 'Check your Slack channel for the test message',
                type: 'neutral'
            });
        }
    };

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            dirty={localSettings.some(setting => setting.dirty)}
            okColor='black'
            okLabel='Save & close'
            testId='slack-modal'
            title=''
            onOk={async () => {
                toast.remove();
                if (await handleSave()) {
                    modal.remove();
                    updateRoute('integrations');
                }
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
                        error={Boolean(errors.slackUrl)}
                        hint={errors.slackUrl || <>
                            Automatically send newly published posts to a channel in Slack or any Slack-compatible service like Discord or Mattermost. Set up a new incoming webhook <a href='https://my.slack.com/apps/new/A0F7XDUAZ-incoming-webhooks'>here</a>, and grab the URL.
                        </>}
                        placeholder='https://hooks.slack.com/services/...'
                        title='Webhook URL'
                        value={slackUrl}
                        onBlur={validate}
                        onChange={e => updateSetting('slack_url', e.target.value)}
                        onKeyDown={() => clearError('slackUrl')}
                    />
                    <div className='flex w-full flex-col gap-2 md:flex-row md:items-center'>
                        <TextField
                            containerClassName='flex-grow'
                            hint='The username to display messages from'
                            title='Username'
                            value={slackUsername}
                            onChange={e => updateSetting('slack_username', e.target.value)}
                        />
                        <Button color='outline' label='Send test notification' onClick={handleTestClick} />
                    </div>
                </Form>
            </div>
        </Modal>
    );
});

export default SlackModal;
