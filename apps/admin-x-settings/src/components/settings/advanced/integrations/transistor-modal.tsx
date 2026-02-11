import APIKeys from './api-keys';
import BookmarkThumb from '../../../../assets/images/integrations/ghost-transistor.png';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import {ConfirmationModal, Form, Icon, Modal, Toggle} from '@tryghost/admin-x-design-system';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useBrowseIntegrations} from '@tryghost/admin-x-framework/api/integrations';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRefreshAPIKey} from '@tryghost/admin-x-framework/api/api-keys';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const TransistorModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();

    const {mutateAsync: refreshAPIKey} = useRefreshAPIKey();
    const handleError = useHandleError();
    const [regenerated, setRegenerated] = useState(false);

    const [transistorEnabled] = getSettingValues<boolean>(settings, ['transistor']);
    const [enabled, setEnabled] = useState<boolean>(!!transistorEnabled);
    // const [useInPortal, setUseInPortal] = useState(true);
    // const [useInEditor, setUseInEditor] = useState(true);
    const [okLabel, setOkLabel] = useState('Save');
    const learnMoreUrl = 'https://ghost.org/integrations/transistor/';

    useEffect(() => {
        setEnabled(transistorEnabled || false);
    }, [transistorEnabled]);

    const integration = integrations.find(({slug}) => slug === 'transistor');
    const adminApiKey = integration?.api_keys?.find(key => key.type === 'admin');

    const handleRegenerate = () => {
        if (!integration || !adminApiKey) {
            throw new Error('Transistor integration or Admin API key not found');
        }

        setRegenerated(false);

        NiceModal.show(ConfirmationModal, {
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
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel='Close'
            dirty={enabled !== transistorEnabled}
            // leftButtonProps={{
            //     label: (
            //         <div className='flex items-center gap-2'>
            //             Learn more
            //             {/* <Icon name='arrow-top-right' size="xs" /> */}
            //         </div>
            //     ),
            //     color: 'outline',
            //     onClick: () => {
            //         window.open(learnMoreUrl, '_blank', 'noopener,noreferrer');
            //     }
            // }}
            okColor={okLabel === 'Saved' ? 'green' : 'black'}
            okLabel={okLabel}
            testId='transistor-modal'
            title=''
            onOk={handleSave}
        >
            <IntegrationHeader
                detail='Podcast hosting platform'
                icon={<Icon name='transistor' size={56} />}
                title='Transistor'
            />
            <div className='mt-7'>
                <Form marginBottom={false} title='Transistor configuration' grouped>
                    <Toggle
                        checked={enabled}
                        direction='rtl'
                        hint={<>Connect your Ghost site with <a className='text-green' href="https://transistor.fm" rel="noopener noreferrer" target="_blank">Transistor.fm</a> to start offering members private podcasts.</>}
                        label='Enable Transistor'
                        onChange={(e) => {
                            setEnabled(e.target.checked);
                        }}
                    />
                    {enabled && (
                        <>
                            <APIKeys keys={[
                                {label: 'Ghost API URL', text: window.location.origin + getGhostPaths().subdir},
                                {
                                    label: 'Ghost Admin API key',
                                    text: adminApiKey?.secret,
                                    hint: regenerated ? <div className='text-green'>Admin API Key was successfully regenerated</div> : undefined,
                                    onRegenerate: handleRegenerate
                                }
                            ]} />
                            <div className='-mt-8 text-xs text-grey-700'>
                                Paste these in any of your private podcast settings in <span className='text-green'>Transistor</span>.
                            </div>
                        </>
                    )}
                </Form>
                {enabled &&
                    <div className='mt-5 flex flex-col items-center'>
                        <a className='w-100 flex flex-col items-stretch justify-between overflow-hidden rounded-md bg-grey-75 transition-all hover:border-grey-400 hover:bg-grey-100 md:flex-row' href={learnMoreUrl} rel="noopener noreferrer" target="_blank">
                            <div className='order-2 px-7 py-5 md:order-1'>
                                <div className='font-semibold'>How to use Transistor in Ghost</div>
                                <div className='mt-1 text-sm text-grey-800 dark:text-grey-500'>Learn how to connect Transistor with Ghost to offer private podcasts in Portal and embed Transistor cards in your posts and pages.</div>
                            </div>
                            <div className='order-1 hidden w-[200px] shrink-0 items-center justify-center overflow-hidden md:!visible md:order-2 md:!flex'>
                                <img alt="Bookmark Thumb" className='min-h-full min-w-full shrink-0' src={BookmarkThumb} />
                            </div>
                        </a>
                    </div>
                }
                {/* {enabled &&
                <>
                    <div className='mt-6 flex flex-col gap-8 rounded-sm border p-7'>
                        <Toggle
                            checked={useInPortal}
                            direction='rtl'
                            hint={
                                <>
                                    Enables a link to the available podcasts in <span className='green'>Member Account page</span> in Portal.
                                </>
                            }
                            label='Use in Portal'
                            onChange={(e) => {
                                setUseInPortal(e.target.checked);
                            }}
                        />
                        <Toggle
                            checked={useInEditor}
                            direction='rtl'
                            hint='Enables a Transistor card that can be added to posts and pages.'
                            label='Use in the Ghost editor'
                            onChange={(e) => {
                                setUseInEditor(e.target.checked);
                            }}
                        />
                    </div>
                </>
                } */}
            </div>
        </Modal>
    );
});

export default TransistorModal;
