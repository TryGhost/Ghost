import React, {useCallback} from 'react';
import {KoenigEditorBase, type KoenigInstance, type NodeType} from '@tryghost/admin-x-design-system';

export interface MemberEmailsEditorProps {
    value?: string;
    placeholder?: string;
    nodes?: NodeType;
    singleParagraph?: boolean;
    className?: string;
    onChange?: (value: string) => void;
}

const MemberEmailsEditor: React.FC<MemberEmailsEditorProps> = ({
    value,
    placeholder,
    nodes = 'EMAIL_NODES',
    singleParagraph = false,
    className,
    onChange
}) => {
    // Koenig's onChange passes the Lexical state as a plain object,
    // but the API expects a JSON string
    const handleChange = useCallback((data: unknown) => {
        if (onChange && data && typeof data === 'object') {
            const stringified = JSON.stringify(data);
            if (stringified !== value) {
                onChange(stringified);
            }
        }
    }, [onChange, value]);

    return (
        <KoenigEditorBase
            className={className}
            emojiPicker={false}
            initialEditorState={value}
            nodes={nodes}
            placeholder={placeholder}
            singleParagraph={singleParagraph}
            onChange={handleChange}
        >
            {(koenig: KoenigInstance) => (
                <>
                    <koenig.ReplacementStringsPlugin />
                    <koenig.ListPlugin />
                </>
            )}
        </KoenigEditorBase>
    );
};

export default MemberEmailsEditor;
