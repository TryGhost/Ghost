import Modal from './modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import type {ButtonProps} from '@tryghost/shade/components';

export interface ConfirmationModalProps {
    title?: React.ReactNode;
    prompt?: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okRunningLabel?: string;
    okVariant?: ButtonProps['variant'];
    onCancel?: () => void;
    onOk?: (modal?: {
        remove: () => void;
    }) => void | Promise<void>;
    customFooter?: boolean | React.ReactNode;
    formSheet?: boolean;
    stickyFooter?: boolean;
}

export const ConfirmationModalContent: React.FC<ConfirmationModalProps> = ({
    title = 'Are you sure?',
    prompt,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okRunningLabel = '...',
    okVariant = 'default',
    onCancel,
    onOk,
    customFooter,
    formSheet = true,
    stickyFooter = false
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
            okLabel={taskState === 'running' ? okRunningLabel : okLabel}
            okVariant={okVariant}
            stickyFooter={stickyFooter}
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
            <div className='py-4'>
                {prompt}
            </div>
        </Modal>
    );
};

export default NiceModal.create(ConfirmationModalContent);
