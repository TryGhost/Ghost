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

    // Stop Cmd+K from bubbling to global search handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.stopPropagation();
        }
    }, []);

    return (
        <div onKeyDown={handleKeyDown}>
            <KoenigEditorBase
                className={className}
                emojiPicker={false}
                inheritFontStyles={false}
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
                        <koenig.HorizontalRulePlugin />
                    </>
                )}
            </KoenigEditorBase>
        </div>
    );
};

export default MemberEmailsEditor;
