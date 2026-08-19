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

const ThemeEditorConfirmModal: React.FC<ThemeEditorConfirmModalProps & {onResolve: (result: boolean) => void}> = ({
    title,
    prompt,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okVariant = 'default',
    onResolve
}) => {
    return (
        <SettingsModal
            backDropClick={false}
            cancelLabel={cancelLabel}
            okLabel={okLabel}
            okVariant={okVariant}
            testId='theme-editor-confirm-modal'
            title={title}
            width={540}
            onCancel={() => onResolve(false)}
            onClose={() => onResolve(false)}
            onOk={() => onResolve(true)}
        >
            <div className='py-4'>
                {prompt}
            </div>
        </SettingsModal>
    );
};

export default ThemeEditorConfirmModal;
