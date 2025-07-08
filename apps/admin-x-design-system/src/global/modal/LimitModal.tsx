import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import Modal from './Modal';

export interface LimitModalProps {
    title?: string;
    prompt?: React.ReactNode;
    okLabel?: string;
    formSheet?: boolean;
    onOk?: (modal?: {
        remove: () => void;
    }) => void | Promise<void>;
}

export const LimitModalContent: React.FC<LimitModalProps> = ({
    title = 'Upgrade your plan',
    prompt,
    okLabel = 'Upgrade',
    formSheet = false,
    onOk
}) => {
    return (
        <Modal
            backDropClick={false}
            formSheet={formSheet}
            okColor='green'
            okLabel={okLabel}
            testId='limit-modal'
            title={title}
            width={540}
            onOk={onOk}
        >
            <div className='py-4 leading-9'>
                {typeof prompt === 'string' && prompt.includes('<') ? (
                    <div dangerouslySetInnerHTML={{__html: prompt}} />
                ) : (
                    prompt
                )}
            </div>
        </Modal>
    );
};

export default NiceModal.create(LimitModalContent);
