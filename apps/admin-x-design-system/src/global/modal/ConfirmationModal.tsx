import Modal from './Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {ButtonColor} from '../Button';

export interface ConfirmationModalProps {
    title?: string;
    prompt?: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okRunningLabel?: string;
    okColor?: ButtonColor;
    onCancel?: () => void;
    onOk?: (modal?: {
        remove: () => void;
    }) => void | Promise<void>;
    customFooter?: boolean | React.ReactNode;
    formSheet?: boolean;
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
    customFooter,
    formSheet = true
}) => {
    const modal = useModal();
    const [taskState, setTaskState] = useState<'running' | ''>('');
    return (
        <Modal
            backDropClick={false}
            buttonsDisabled={taskState === 'running'}
            cancelLabel={cancelLabel}
            footer={customFooter}
            formSheet={formSheet}
            okColor={okColor}
            okLabel={taskState === 'running' ? okRunningLabel : okLabel}
            testId='confirmation-modal'
            title={title}
            width={540}
            onCancel={onCancel}
            onOk={async () => {
                setTaskState('running');

                try {
                    await onOk?.(modal);
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('Unhandled Promise Rejection. Make sure you catch errors in your onOk handler.', e);
                }
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
