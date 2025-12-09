import React, {useCallback} from 'react';
import {KoenigEditorBase} from '@tryghost/admin-x-design-system';

export interface MemberEmailsEditorProps {
    value?: string;
    placeholder?: string;
    className?: string;
    onChange?: (value: string) => void;
}

const MemberEmailsEditor: React.FC<MemberEmailsEditorProps> = ({
    value,
    placeholder,
    className,
    onChange
}) => {
    // Koenig's onChange passes the Lexical state as a plain object,
    // but the API expects a JSON string
    const handleChange = useCallback((data: unknown) => {
        if (onChange && data && typeof data === 'object') {
            onChange(JSON.stringify(data));
        }
    }, [onChange]);

    return (
        <KoenigEditorBase
            className={className}
            emojiPicker={false}
            initialEditorState={value}
            nodes='BASIC_NODES'
            placeholder={placeholder}
            singleParagraph={false}
            onChange={handleChange}
        >
            {() => null}
        </KoenigEditorBase>
    );
};

export default MemberEmailsEditor;
