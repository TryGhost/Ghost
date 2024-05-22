import IntegrationHeader from './IntegrationHeader';
import NiceModal from '@ebay/nice-modal-react';
import {Form, Modal, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {ReactComponent as Icon} from '../../../../assets/icons/amp.svg';
import {Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const AmpModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();
    const [ampEnabled] = getSettingValues<boolean>(settings, ['amp']);
    const [ampId] = getSettingValues<string>(settings, ['amp_gtag_id']);
    const modal = NiceModal.useModal();
    const [enabled, setEnabled] = useState(false);
    const [trackingId, setTrackingId] = useState<string | null>('');
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    useEffect(() => {
        setEnabled(ampEnabled || false);
        setTrackingId(ampId || null);
    }, [ampEnabled, ampId]);

    const handleSave = async () => {
        const updates: Setting[] = [
            {key: 'amp', value: enabled},
            {key: 'amp_gtag_id', value: trackingId}
        ];
        try {
            await editSettings(updates);
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            dirty={!(enabled === ampEnabled) || !(trackingId === ampId)}
            okColor='black'
            okLabel='Save & close'
            testId='amp-modal'
            title=''
            onOk={async () => {
                await handleSave();
                modal.remove();
                updateRoute('integrations');
            }}
        >
            <IntegrationHeader
                detail='Accelerated Mobile Pages'
                icon={<Icon className='h-14 w-14' />}
                title='AMP'
            />
            <div className='mt-7'>
                <Form marginBottom={false} title='AMP configuration' grouped>
                    <Toggle
                        checked={enabled}
                        direction='rtl'
                        hint={<>Google AMP is <a className='text-green' href="https://en.m.wikipedia.org/wiki/Accelerated_Mobile_Pages" rel="noopener noreferrer" target='_blank'>being retired</a> — this feature will be removed in Ghost 6.0</>}
                        label='Enable AMP'
                        onChange={(e) => {
                            setEnabled(e.target.checked);
                        }}
                    />
                    {enabled && (
                        <TextField
                            hint='Tracks AMP traffic in Google Analytics'
                            placeholder='UA-XXXXXXX-X'
                            title='Google Analytics Tracking ID'
                            value={trackingId || ''}
                            onChange={(e) => {
                                setTrackingId(e.target.value);
                            }}
                        />
                    )}
                </Form>
            </div>
        </Modal>
    );
});

export default AmpModal;
