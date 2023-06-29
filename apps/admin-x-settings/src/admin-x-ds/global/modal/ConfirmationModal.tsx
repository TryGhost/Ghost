import Modal from './Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';

export interface ConfirmationModalProps {
    title?: string;
    prompt?: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okRunningLabel?: string;
    okColor?: string;
    onCancel?: () => void;
    onOk?: (modal?: {
        remove: () => void;
    }) => void;
    customFooter?: boolean | React.ReactNode;
}

export const ConfirmationModalContent: React.FC<ConfirmationModalProps> = ({
    title = 'Are you sure?',
    prompt,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okRunningLabel = '...',
    okColor = 'black',
    onCancel,
    onOk,
    customFooter
}) => {
    const modal = useModal();
    const [taskState, setTaskState] = useState<'running' | ''>('');
    return (
        <Modal
            backDropClick={false}
            cancelLabel={cancelLabel}
            footer={customFooter}
            okColor={okColor}
            okLabel={taskState === 'running' ? okRunningLabel : okLabel}
            size={540}
            testId='confirmation-modal'
            title={title}
            onCancel={onCancel}
            onOk={async () => {
                setTaskState('running');
                await onOk?.(modal);
                setTaskState('');
            }}
        >
            <div className='py-4 leading-9'>
                {prompt}
            </div>
        </Modal>
    );
};

export default NiceModal.create(ConfirmationModalContent);
