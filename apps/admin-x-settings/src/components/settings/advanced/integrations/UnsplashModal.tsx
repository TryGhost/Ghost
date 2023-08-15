import Form from '../../../../admin-x-ds/global/form/Form';
import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import {ReactComponent as Icon} from '../../../../assets/icons/unsplash.svg';

const UnsplashModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Close'
            title=''
            onOk={() => {
                modal.remove();
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
                        direction='rtl'
                        hint={<>Enable <a href="https://unsplash" rel="noopener noreferrer" target="_blank">Unsplash</a> image integration for your posts</>}
                        label='Enable Unsplash'
                    />
                </Form>
            </div>
        </Modal>
    );
});

export default UnsplashModal;