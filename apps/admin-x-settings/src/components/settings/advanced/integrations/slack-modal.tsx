import BrandIcon from '../../../icons/brand-icon';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import useSettingGroup from '../../../../hooks/use-setting-group';
import validator from 'validator';
import {Button, Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, Input} from '@tryghost/shade/components';
import {SettingsModal} from '@tryghost/shade/patterns';
import {getSettingValues, useTestSlack} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
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
        toast.dismiss();
        if (await handleSave()) {
            await testSlack(null);
            toast.info('Check your Slack channel for the test message');
        }
    };

    const isDirty = localSettings.some(setting => setting.dirty);

    return (
        <SettingsModal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel='Close'
            dirty={isDirty}
            okLabel={okProps.label || 'Save'}
            okVariant={okProps.variant}
            testId='slack-modal'
            title=''
            onOk={async () => {
                toast.dismiss();
                await handleSave();
            }}
        >
            <IntegrationHeader
                detail='A messaging app for teams'
                icon={<BrandIcon name='slack' size={56} />}
                title='Slack'
            />
            <div className='mt-7'>
                <FieldSet className='gap-0'>
                    <FieldLegend className='mb-3 text-md! leading-supertight font-bold md:text-lg!'>Slack configuration</FieldLegend>
                    <FieldGroup className='gap-8 rounded-sm border border-border-default p-4 md:p-7 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                    <Field data-invalid={Boolean(errors.slackUrl) || undefined}>
                        <FieldLabel htmlFor='slack-webhook-url'>Webhook URL</FieldLabel>
                        <Input aria-invalid={Boolean(errors.slackUrl) || undefined} id='slack-webhook-url' placeholder='https://hooks.slack.com/services/...' value={slackUrl} onBlur={validate} onChange={e => updateSetting('slack_url', e.target.value)} onKeyDown={() => clearError('slackUrl')} />
                        {errors.slackUrl ? <FieldError>{errors.slackUrl}</FieldError> : <FieldDescription><>
                            Automatically send newly published posts to a channel in Slack or any Slack-compatible service like Discord or Mattermost. Set up a new incoming webhook <a href='https://my.slack.com/apps/new/A0F7XDUAZ-incoming-webhooks'>here</a>, and grab the URL.
                        </></FieldDescription>}
                    </Field>
                    <div className='flex w-full flex-col gap-2 md:flex-row md:items-center'>
                        <Field className='grow'>
                            <FieldLabel htmlFor='slack-username'>Username</FieldLabel>
                            <Input id='slack-username' value={slackUsername} onChange={e => updateSetting('slack_username', e.target.value)} />
                            <FieldDescription>The username to display messages from</FieldDescription>
                        </Field>
                        <Button type='button' variant='outline' onClick={handleTestClick}>Send test notification</Button>
                    </div>
                    </FieldGroup>
                </FieldSet>
            </div>
        </SettingsModal>
    );
});

export default SlackModal;
