import Form from '../../../../admin-x-ds/global/form/Form';
import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import {ReactComponent as Icon} from '../../../../assets/icons/amp.svg';
import {useState} from 'react';

const AmpModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    const [enabled, setEnabled] = useState(false);

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Save'
            title=''
            onOk={() => {
                modal.remove();
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
                        direction='rtl'
                        hint={<>Enable Google Accelerated Mobile Pages <strong className='text-red'>[&larr; link to be set]</strong> for your posts</>}
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
                        />
                    )}
                </Form>
            </div>
        </Modal>
    );
});

export default AmpModal;