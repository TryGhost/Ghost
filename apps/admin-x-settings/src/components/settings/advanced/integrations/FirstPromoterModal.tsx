import Form from '../../../../admin-x-ds/global/form/Form';
import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import {ReactComponent as Icon} from '../../../../assets/icons/firstpromoter.svg';
import {useState} from 'react';

const FirstpromoterModal = NiceModal.create(() => {
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
                detail='Launch your own member referral program'
                icon={<Icon className='-mt-2 h-14 w-14' />}
                title='FirstPromoter'
            />
            <div className='mt-7'>
                <Form marginBottom={false} title='FirstPromoter configuration' grouped>
                    <Toggle
                        direction='rtl'
                        hint={<>Enable <a className='text-green' href="https://firstpromoter.com/?fpr=ghost&fp_sid=admin" rel="noopener noreferrer" target="_blank">FirstPromoter</a> for tracking referrals</>}
                        label='Enable FirstPromoter'
                        onChange={(e) => {
                            setEnabled(e.target.checked);
                        }}
                    />
                    {enabled && (
                        <TextField
                            hint={<>
                                Affiliate and referral tracking, find your ID  <a className='text-green' href="https://ghost.org/help/firstpromoter-id/" rel="noopener noreferrer" target="_blank">here</a>
                            </>}
                            placeholder='XXXXXXXX'
                            title='FirstPromoter account ID'
                        />
                    )}
                </Form>
            </div>
        </Modal>
    );
});

export default FirstpromoterModal;