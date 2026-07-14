import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import {Input, Label} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {Modal} from '@tryghost/admin-x-design-system';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {Stack, Text} from '@tryghost/shade/primitives';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const ClaudeModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();
    const [configuredApiKey] = getSettingValues<string>(settings, ['claude_api_key']);
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [okLabel, setOkLabel] = useState('Save');
    const isConfigured = Boolean(configuredApiKey);

    useEffect(() => {
        setApiKey('');
    }, [configuredApiKey]);

    const saveApiKey = async () => {
        const updates: Setting[] = [{key: 'claude_api_key', value: apiKey.trim()}];

        try {
            setIsSaving(true);
            await editSettings(updates);
            setApiKey('');
            setOkLabel('Saved');
            setTimeout(() => setOkLabel('Save'), 1000);
        } catch (error) {
            handleError(error);
        } finally {
            setIsSaving(false);
        }
    };

    const clearApiKey = async () => {
        try {
            setIsSaving(true);
            await editSettings([{key: 'claude_api_key', value: null}]);
            setApiKey('');
        } catch (error) {
            handleError(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            buttonsDisabled={isSaving}
            cancelLabel='Close'
            dirty={Boolean(apiKey)}
            leftButtonProps={isConfigured ? {
                color: 'red',
                label: 'Clear API key',
                link: true,
                onClick: clearApiKey
            } : undefined}
            okColor={okLabel === 'Saved' ? 'green' : 'black'}
            okDisabled={!apiKey.trim()}
            okLabel={okLabel}
            okLoading={isSaving}
            testId='claude-modal'
            title=''
            onOk={saveApiKey}
        >
            <IntegrationHeader
                detail='Generate accessible image descriptions in the editor'
                icon={<LucideIcon.Sparkles className='size-12 text-foreground' strokeWidth={1.5} />}
                title='Claude'
            />
            <Stack className='mt-7' gap='sm'>
                <Label htmlFor='claude-api-key'>Claude API key</Label>
                <Input
                    autoComplete='off'
                    id='claude-api-key'
                    placeholder={isConfigured ? '••••••••' : 'Enter your Claude API key'}
                    type='password'
                    value={apiKey}
                    onChange={event => setApiKey(event.target.value)}
                />
                <Text size='sm' tone='secondary'>
                    This key enables alt-text generation for feature and inline images in the editor. It stays server-side and is hidden after saving.
                </Text>
            </Stack>
        </Modal>
    );
});

export default ClaudeModal;
