import IntegrationHeader from './IntegrationHeader';
import NiceModal from '@ebay/nice-modal-react';
import {Form, Modal, Toggle} from '@tryghost/admin-x-design-system';
import {ReactComponent as Icon} from '../../../../assets/icons/unsplash.svg';
import {Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const UnsplashModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = NiceModal.useModal();
    const {settings} = useGlobalData();
    const [unsplashEnabled] = getSettingValues<boolean>(settings, ['unsplash']);
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const handleToggleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const updates: Setting[] = [
            {key: 'unsplash', value: (e.target.checked)}
        ];
        try {
            await editSettings(updates);
        } catch (error) {
            handleError(error);
        }
    };

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            okColor='black'
            okLabel='Save & close'
            testId='unsplash-modal'
            title=''
            onOk={() => {
                modal.remove();
                updateRoute('integrations');
            }}
        >
            <IntegrationHeader
                detail='Beautiful, free photos'
                icon={<Icon className='h-12 w-12' />}
                title='Unsplash'
            />
            <div className='mt-7'>
                <Form marginBottom={false} grouped>
                    <Toggle
                        checked={unsplashEnabled}
                        direction='rtl'
                        hint={<>Enable <a className='text-green' href="https://unsplash.com" rel="noopener noreferrer" target="_blank">Unsplash</a> image integration for your posts</>}
                        label='Enable Unsplash'
                        onChange={handleToggleChange}
                    />
                </Form>
            </div>
        </Modal>
    );
});

export default UnsplashModal;
