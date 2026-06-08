import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {Modal} from '@tryghost/admin-x-design-system';

export type ThemeEditorConfirmModalProps = {
    title: string;
    prompt: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okColor?: 'black' | 'red' | 'green' | 'outline';
};

const ThemeEditorConfirmModal = NiceModal.create<ThemeEditorConfirmModalProps>(({
    title,
    prompt,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okColor = 'black'
}) => {
    const modal = useModal();

    const closeWithResult = (result: boolean) => {
        modal.resolve(result);
        modal.remove();
    };

    return (
        <Modal
            backDropClick={false}
            cancelLabel={cancelLabel}
            okColor={okColor}
            okLabel={okLabel}
            testId='theme-editor-confirm-modal'
            title={title}
            width={540}
            onCancel={() => closeWithResult(false)}
            onOk={() => closeWithResult(true)}
        >
            <div className='py-4'>
                {prompt}
            </div>
        </Modal>
    );
});

export default ThemeEditorConfirmModal;
