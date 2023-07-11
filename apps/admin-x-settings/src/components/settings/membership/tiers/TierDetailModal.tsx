import Form from '../../../../admin-x-ds/global/form/Form';
import Heading from '../../../../admin-x-ds/global/Heading';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import TierDetailPreview from './TierDetailPreview';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import useRouting from '../../../../hooks/useRouting';

interface TierDetailModalProps {

}

const TierDetailModal: React.FC<TierDetailModalProps> = () => {
    const {updateRoute} = useRouting();
    return <Modal
        afterClose={() => {
            updateRoute('tiers');
        }}
        okLabel='Save & close'
        size='lg'
        title='Tier'
        stickyFooter>
        <div className='mt-8 flex items-start gap-10'>
            <div className='flex grow flex-col gap-10'>
                <Form title='Basic'>
                    <TextField
                        placeholder='Bronze'
                        title='Name'
                    />
                    <TextField
                        placeholder='Full access to premium content'
                        title='Description'
                    />
                    <div className='flex gap-10'>
                        <div className='flex basis-1/2 flex-col gap-2'>
                            <TextField
                                placeholder='1'
                                title='Prices'
                                value='5'
                            />
                            <TextField
                                placeholder='10'
                                value='50'
                            />
                        </div>
                        <div className='basis-1/2'>
                            <div className='flex justify-between'>
                                <Heading level={6} grey>Add a free trial</Heading>
                                <Toggle onChange={() => {}} />
                            </div>
                            <TextField
                                hint={<>
                                    Members will be subscribed at full price once the trial ends. <a href="https://ghost.org/" rel="noreferrer" target="_blank">Learn more</a>
                                </>}
                                placeholder='0'
                                disabled
                            />
                        </div>
                    </div>
                </Form>

                <Form title='Benefits'>
                    TBD
                </Form>
            </div>
            <div className='sticky top-[77px] shrink-0 basis-[380px]'>
                <TierDetailPreview />
            </div>
        </div>
    </Modal>;
};

export default NiceModal.create(TierDetailModal);