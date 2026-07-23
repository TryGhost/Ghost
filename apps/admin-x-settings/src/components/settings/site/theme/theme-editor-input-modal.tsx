import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {Field, FieldLabel, Input} from '@tryghost/shade/components';
import {SettingsModal} from '@tryghost/shade/patterns';

export type ThemeEditorInputModalProps = {
    title: string;
    prompt?: React.ReactNode;
    fieldTitle: string;
    initialValue: string;
    placeholder?: string;
    cancelLabel?: string;
    okLabel?: string;
};

const ThemeEditorInputModal = NiceModal.create<ThemeEditorInputModalProps>(({
    title,
    prompt,
    fieldTitle,
    initialValue,
    placeholder,
    cancelLabel = 'Cancel',
    okLabel = 'Continue'
}) => {
    const modal = useModal();
    const [value, setValue] = useState(initialValue);

    const closeWithResult = (result: string | null) => {
        modal.resolve(result);
        modal.remove();
    };

    return (
        <SettingsModal
            backDropClick={false}
            cancelLabel={cancelLabel}
            okDisabled={!value.trim()}
            okLabel={okLabel}
            testId='theme-editor-input-modal'
            title={title}
            width={540}
            onCancel={() => closeWithResult(null)}
            onOk={() => closeWithResult(value)}
        >
            <div className='flex flex-col gap-4 py-4'>
                {prompt}
                <Field>
                    <FieldLabel htmlFor='theme-editor-input'>{fieldTitle}</FieldLabel>
                    <Input className='h-[var(--control-height)] border-transparent bg-muted' id='theme-editor-input' placeholder={placeholder} value={value} autoFocus onChange={event => setValue(event.target.value)} />
                </Field>
            </div>
        </SettingsModal>
    );
});

export default ThemeEditorInputModal;
