import EmailCustomizationController from './controllers/email-customization-controller';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';

const EmailCustomizationModal: React.FC<RoutingModalProps> = ({params}) => {
    const {updateRoute} = useRouting();

    return (
        <EmailCustomizationController
            id={params?.id}
            type={params?.type}
            onAfterClose={() => {
                updateRoute('newsletters');
            }}
        />
    );
};

export default NiceModal.create(EmailCustomizationModal);
