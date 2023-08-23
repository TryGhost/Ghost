import Modal from './Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import useRouting from '../../../hooks/useRouting';

export interface LimitModalProps {
    title?: string;
    prompt?: React.ReactNode;
    okLabel?: string;
    formSheet?: boolean;
}

export const LimitModalContent: React.FC<LimitModalProps> = ({
    title = 'Upgrade your plan',
    prompt,
    okLabel = 'Upgrade',
    formSheet = false
}) => {
    const {updateRoute} = useRouting();
    return (
        <Modal
            backDropClick={false}
            formSheet={formSheet}
            okColor='green'
            okLabel={okLabel}
            size={540}
            testId='limit-modal'
            title={title}
            onOk={() => updateRoute({isExternal: true, route: 'pro'})}
        >
            <div className='py-4 leading-9'>
                {prompt}
            </div>
        </Modal>
    );
};

export default NiceModal.create(LimitModalContent);
