import NiceModal from '@ebay/nice-modal-react';
import {Button} from '@tryghost/admin-x-design-system';
import {Modal} from '@tryghost/admin-x-design-system';

const OfferSuccess = () => {
    return <Modal
        footer={false}
        height='full'
        size='lg'
        topRightContent='close'
    >
        <div className='flex h-full flex-col items-center justify-center text-center'>
            <h1 className='text-4xl'>Your new offer is live!</h1>
            <p className='mt-4 max-w-[510px] text-[1.6rem]'>You can share the link anywhere. In your newsletter, social media, a podcast, or in-person. It all just works.</p>
            <div className='mt-8 flex w-full max-w-md flex-col gap-8'>
                <Button color='green' label='Copy link' fullWidth />
                <div className='flex items-center gap-4 text-xs font-medium before:h-px before:grow before:bg-grey-300 before:content-[""] after:h-px after:grow after:bg-grey-300 after:content-[""]'>OR</div>
                <div className='flex gap-2'>
                    <Button className='h-8 border border-grey-300' icon='twitter-x' iconColorClass='w-[14px] h-[14px]' size='sm' fullWidth />
                    <Button className='h-8 border border-grey-300' icon='facebook' size='sm' fullWidth />
                    <Button className='h-8 border border-grey-300' icon='linkedin' size='sm' fullWidth />
                </div>
            </div>
        </div>
    </Modal>;
};

export default NiceModal.create(OfferSuccess);
