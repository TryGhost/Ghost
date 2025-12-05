import React from 'react';
import {KoenigEditorBase, type NodeType} from '@tryghost/admin-x-design-system';

export interface MemberEmailsEditorProps {
    value?: string;
    placeholder?: string;
    nodes?: NodeType;
    singleParagraph?: boolean;
    className?: string;
}

const MemberEmailsEditor: React.FC<MemberEmailsEditorProps> = ({
    value,
    placeholder,
    nodes = 'DEFAULT_NODES',
    singleParagraph = false,
    className
}) => {
    return (
        <KoenigEditorBase
            className={className}
            emojiPicker={false}
            initialEditorState={value}
            nodes={nodes}
            placeholder={placeholder}
            singleParagraph={singleParagraph}
        >
            {() => null}
        </KoenigEditorBase>
    );
};

export default MemberEmailsEditor;
