import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {SettingsModal} from '@tryghost/shade/patterns';
import type {ButtonProps} from '@tryghost/shade/components';

export type ThemeEditorConfirmModalProps = {
    title: string;
    prompt: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okVariant?: ButtonProps['variant'];
};

const ThemeEditorConfirmModal = NiceModal.create<ThemeEditorConfirmModalProps>(({
    title,
    prompt,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okVariant = 'default'
}) => {
    const modal = useModal();

    const closeWithResult = (result: boolean) => {
        modal.resolve(result);
        modal.remove();
    };

    return (
        <SettingsModal
            backDropClick={false}
            cancelLabel={cancelLabel}
            okLabel={okLabel}
            okVariant={okVariant}
            testId='theme-editor-confirm-modal'
            title={title}
            width={540}
            onCancel={() => closeWithResult(false)}
            onOk={() => closeWithResult(true)}
        >
            <div className='py-4'>
                {prompt}
            </div>
        </SettingsModal>
    );
});

export default ThemeEditorConfirmModal;
