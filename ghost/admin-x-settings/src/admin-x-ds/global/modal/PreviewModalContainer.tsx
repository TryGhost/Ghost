import Button from '../Button';
import NiceModal from '@ebay/nice-modal-react';
import PreviewModal, {PreviewModalProps} from './PreviewModal';
import React from 'react';

const PreviewModalContainer: React.FC<PreviewModalProps> = ({...props}) => {
    return (
        <Button color='black' label='Open preview modal' onClick={() => {
            NiceModal.show(PreviewModal, {...props});
        }} />
    );
};

export default PreviewModalContainer;