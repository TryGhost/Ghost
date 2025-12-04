import React, {useCallback, useMemo} from 'react';
import KoenigEditorBase, {type NodeType} from './KoenigEditorBase';

export interface MinimalEditorProps {
    value?: string
    onChange?: (lexical: string) => void
    onBlur?: () => void
    placeholder?: string
    nodes?: NodeType
    emojiPicker?: boolean;
    darkMode?: boolean;
    singleParagraph?: boolean;
    className?: string;
}

const MinimalEditor: React.FC<MinimalEditorProps> = ({
    value,
    onChange,
    nodes = 'BASIC_NODES',
    singleParagraph = false,
    ...props
}) => {
    // Parse the initial Lexical state if provided
    const initialEditorState = useMemo(() => {
        if (!value) {
            return undefined;
        }
        try {
            // Verify it's valid JSON
            JSON.parse(value);
            return value;
        } catch {
            // If it's not valid JSON, it might be HTML or empty
            return undefined;
        }
    }, [value]);

    // Koenig's onChange passes the Lexical state as a plain object
    const handleChange = useCallback((data: unknown) => {
        if (onChange && data && typeof data === 'object') {
            onChange(JSON.stringify(data));
        }
    }, [onChange]);

    return (
        <KoenigEditorBase
            {...props}
            initialEditorState={initialEditorState}
            nodes={nodes}
            singleParagraph={singleParagraph}
            onChange={handleChange}
        >
            {() => null}
        </KoenigEditorBase>
    );
};

export default MinimalEditor;
