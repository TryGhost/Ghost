import IntegrationHeader from './IntegrationHeader';
import NiceModal from '@ebay/nice-modal-react';
import toast from 'react-hot-toast';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import validator from 'validator';
import {Button, Form, Modal, TextField, showToast} from '@tryghost/admin-x-design-system';
import {ReactComponent as Icon} from '../../../../assets/icons/slack.svg';
import {getSettingValues, useTestSlack} from '@tryghost/admin-x-framework/api/settings';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const SlackModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();

    const {localSettings, updateSetting, handleSave, validate, errors, clearError, okProps} = useSettingGroup({
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (slackUrl && !validator.isURL(slackUrl, {require_protocol: true})) {
                newErrors.slackUrl = 'The URL must be in a format like https://hooks.slack.com/services/<your personal key>';
            }

            return newErrors;
        },
        savingDelay: 500
    });
    const [slackUrl, slackUsername] = getSettingValues<string>(localSettings, ['slack_url', 'slack_username']);

    const {mutateAsync: testSlack} = useTestSlack();

    const handleTestClick = async () => {
        toast.remove();
        if (await handleSave()) {
            await testSlack(null);
            showToast({
                title: 'Check your Slack channel for the test message',
                type: 'info'
            });
        }
    };

    const isDirty = localSettings.some(setting => setting.dirty);

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel='Close'
            dirty={isDirty}
            okColor={okProps.color}
            okLabel={okProps.label || 'Save'}
            testId='slack-modal'
            title=''
            onOk={async () => {
                toast.remove();
                await handleSave();
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
