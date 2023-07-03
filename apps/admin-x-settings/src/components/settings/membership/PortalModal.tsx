import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {PreviewModalContent} from '../../../admin-x-ds/global/modal/PreviewModal';

const PortalModal: React.FC = () => {
    return <PreviewModalContent
        preview={<>Preview</>}
        sidebar={<>Sidebar</>}
        testId='portal-modal'
    />;
};

export default NiceModal.create(PortalModal);