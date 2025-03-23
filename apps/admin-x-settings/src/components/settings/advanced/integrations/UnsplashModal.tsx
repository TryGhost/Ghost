import IntegrationHeader from './IntegrationHeader';
import NiceModal from '@ebay/nice-modal-react';
import {Form, Modal, Toggle} from '@tryghost/admin-x-design-system';
import {ReactComponent as Icon} from '../../../../assets/icons/unsplash.svg';
import {Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const UnsplashModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();
    const [unsplashEnabled] = getSettingValues<boolean>(settings, ['unsplash']);
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();
    const [okLabel, setOkLabel] = useState('Save');
    const [enabled, setEnabled] = useState<boolean>(!!unsplashEnabled);

    useEffect(() => {
        setEnabled(unsplashEnabled || false);
    }, [unsplashEnabled]);

    const handleToggleChange = async () => {
        const updates: Setting[] = [
            {key: 'unsplash', value: (enabled)}
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
        } catch (error) {
            handleError(error);
        } finally {
            setTimeout(() => setOkLabel('Save'), 1000);
        }
    };

    const isDirty = !(enabled === unsplashEnabled);

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel='Close'
            dirty={isDirty}
            okColor={okLabel === 'Saved' ? 'green' : 'black'}
            okLabel={okLabel}
            testId='unsplash-modal'
            title=''
            onOk={handleToggleChange}
        >
            <IntegrationHeader
                detail='Beautiful, free photos'
                icon={<Icon className='h-12 w-12' />}
                title='Unsplash'
            />
            <div className='mt-7'>
                <Form marginBottom={false} grouped>
                    <Toggle
                        checked={enabled}
                        direction='rtl'
                        hint={<>Enable <a className='text-green' href="https://unsplash.com" rel="noopener noreferrer" target="_blank">Unsplash</a> image integration for your posts</>}
                        label='Enable Unsplash'
                        onChange={(e) => {
                            setEnabled(e.target.checked);
                        }}
                    />
                </Form>
            </div>
        </Modal>
    );
});

export default UnsplashModal;
