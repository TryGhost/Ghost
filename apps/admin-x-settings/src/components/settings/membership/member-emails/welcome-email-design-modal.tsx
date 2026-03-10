import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {Modal} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const WelcomeEmailDesignModal: React.FC = () => {
    const {updateRoute} = useRouting();

    return (
        <Modal
            afterClose={() => {
                updateRoute('memberemails');
            }}
            cancelLabel='Close'
            size='md'
            testId='welcome-email-design-modal'
            title='Welcome email design'
        >
            <p className='text-grey-700'>Design customization options will appear here.</p>
        </Modal>
    );
};

export default NiceModal.create(WelcomeEmailDesignModal);
