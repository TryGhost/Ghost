import React, { useState } from 'react';
import { Field, FieldLabel, Input } from '@tryghost/shade/components';
import { SettingsModal } from '@tryghost/shade/patterns';

export type ThemeEditorInputModalProps = {
  title: string;
  prompt?: React.ReactNode;
  fieldTitle: string;
  initialValue: string;
  placeholder?: string;
  cancelLabel?: string;
  okLabel?: string;
};

const ThemeEditorInputModal: React.FC<
  ThemeEditorInputModalProps & { onResolve: (result: string | null) => void }
> = ({
  title,
  prompt,
  fieldTitle,
  initialValue,
  placeholder,
  cancelLabel = 'Cancel',
  okLabel = 'Continue',
  onResolve,
}) => {
  const [value, setValue] = useState(initialValue);

  return (
    <SettingsModal
      backDropClick={false}
      cancelLabel={cancelLabel}
      okDisabled={!value.trim()}
      okLabel={okLabel}
      testId="theme-editor-input-modal"
      title={title}
      width={540}
      onCancel={() => onResolve(null)}
      onClose={() => onResolve(null)}
      onOk={() => onResolve(value)}
    >
      <div className="flex flex-col gap-4 py-4">
        {prompt}
        <Field>
          <FieldLabel htmlFor="theme-editor-input">{fieldTitle}</FieldLabel>
          <Input
            id="theme-editor-input"
            placeholder={placeholder}
            value={value}
            autoFocus
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
      </div>
    </SettingsModal>
  );
};

export default ThemeEditorInputModal;
