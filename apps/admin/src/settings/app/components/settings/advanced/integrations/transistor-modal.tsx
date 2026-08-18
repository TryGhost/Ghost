import APIKeys from './api-keys';
import BookmarkThumb from '@/settings/app/assets/images/integrations/ghost-transistor.png';
import BrandIcon from '@/settings/app/components/icons/brand-icon';
import IntegrationHeader from './integration-header';
import {Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet, Switch} from '@tryghost/shade/components';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {SettingsModal} from '@tryghost/shade/patterns';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useBrowseIntegrations} from '@tryghost/admin-x-framework/api/integrations';
import {useConfirmation} from '@/settings/app/components/providers/confirmation-provider';
import {useEffect, useState} from 'react';
import {useGlobalData} from '@/settings/app/components/providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRefreshAPIKey} from '@tryghost/admin-x-framework/api/api-keys';
import {useSettingsNavigation} from '@/settings/app/hooks/use-settings-navigation';

function TransistorModal() {
    const {updateRoute} = useSettingsNavigation();
    const {config, settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();

    const {mutateAsync: refreshAPIKey} = useRefreshAPIKey();
    const handleError = useHandleError();
    const {confirm} = useConfirmation();
    const [regenerated, setRegenerated] = useState(false);

    const builtInApiIntegrationsDisabled = config.hostSettings?.limits?.customIntegrations?.disabled;
    const [transistorEnabled] = getSettingValues<boolean>(settings, ['transistor']);
    const [enabled, setEnabled] = useState<boolean>(!!transistorEnabled);
    const [okLabel, setOkLabel] = useState('Save');

    useEffect(() => {
        setEnabled(transistorEnabled || false);
    }, [transistorEnabled]);

    useEffect(() => {
        if (builtInApiIntegrationsDisabled) {
            updateRoute('integrations');
        }
    }, [builtInApiIntegrationsDisabled, updateRoute]);

    const integration = integrations.find(({slug}) => slug === 'transistor');
    const adminApiKey = integration?.api_keys?.find(key => key.type === 'admin');

    const handleRegenerate = () => {
        if (!integration || !adminApiKey) {
            throw new Error('Transistor integration or Admin API key not found');
        }

        setRegenerated(false);

        confirm({
            title: 'Regenerate Admin API Key',
            prompt: 'You will need to update the API key in your Transistor account settings after regenerating.',
            okLabel: 'Regenerate Admin API Key',
            onOk: async (confirmModal) => {
                try {
                    await refreshAPIKey({integrationId: integration.id, apiKeyId: adminApiKey.id});
                    setRegenerated(true);
                    confirmModal?.remove();
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    const handleSave = async () => {
        const updates: Setting[] = [
            {
                key: 'transistor',
                value: enabled
            }
        ];
        try {
            setOkLabel('Saving...');
            await Promise.all([
                editSettings(updates),
                new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                })
            ]);
            setOkLabel('Saved');
        } catch (e) {
            handleError(e);
        } finally {
            setTimeout(() => setOkLabel('Save'), 1000);
        }
    };

    return (
        <SettingsModal
            cancelLabel='Close'
            dirty={enabled !== transistorEnabled}
            okLabel={okLabel}
            okVariant='default'
            testId='transistor-modal'
            title=''
            onClose={() => {
                updateRoute('integrations');
            }}
            onOk={handleSave}
        >
            <IntegrationHeader
                detail='Give your members access to private podcasts'
                icon={<BrandIcon name='transistor' size={56} />}
                title='Transistor.fm'
            />
            <>
                <FieldSet className='gap-0'>
                    <FieldGroup className='gap-8 rounded-sm border border-border-default p-4 md:p-7'>
                        <Field orientation='horizontal'>
                            <FieldContent>
                                <FieldLabel htmlFor='transistor-enabled'>Enable Transistor</FieldLabel>
                                <FieldDescription>Connect your Ghost site with <a className='text-green' href="https://transistor.fm" rel="noopener noreferrer" target="_blank">Transistor.fm</a> to offer members private podcasts.</FieldDescription>
                            </FieldContent>
                            <Switch checked={enabled} id='transistor-enabled' onCheckedChange={setEnabled} />
                        </Field>
                        {enabled && (
                            <APIKeys keys={[
                                {
                                    id: 'admin-api-key',
                                    label: 'Admin API key',
                                    text: adminApiKey?.secret,
                                    hint: regenerated ? <div className='text-green'>Admin API Key was successfully regenerated</div> : undefined,
                                    onRegenerate: handleRegenerate
                                },
                                {id: 'api-url', label: 'API URL', text: window.location.origin + getGhostPaths().subdir}
                            ]} />
                        )}
                    </FieldGroup>
                </FieldSet>
                {enabled &&
                    <div className='mt-5 flex flex-col items-center'>
                        <a className='flex w-100 flex-col items-stretch justify-between overflow-hidden rounded-md bg-grey-50 transition-all hover:border-grey-400 hover:bg-grey-100 md:flex-row dark:bg-grey-900 dark:hover:bg-grey-950' href="https://ghost.org/integrations/transistor/" rel="noopener noreferrer" target="_blank">
                            <div className='order-2 px-7 py-5 md:order-1'>
                                <div className='text-md font-semibold'>How to use Transistor in Ghost</div>
                                <div className='mt-1 text-grey-800 dark:text-grey-500'>Learn more about connecting Transistor with Ghost to offer members access to private podcasts in Portal or as an embed in posts and pages with a custom Transistor card.</div>
                            </div>
                            <div className='order-1 hidden w-[200px] shrink-0 items-center justify-center overflow-hidden md:visible! md:order-2 md:flex!'>
                                <img alt="Bookmark Thumb" className='min-h-full min-w-full shrink-0' src={BookmarkThumb} />
                            </div>
                        </a>
                    </div>
                }
            </>
        </SettingsModal>
    );
}

export default TransistorModal;
