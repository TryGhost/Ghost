import React, {useCallback} from 'react';
import {KoenigEditorBase, type KoenigInstance, type NodeType} from '@tryghost/admin-x-design-system';
import {cn} from '@tryghost/shade';

const placeholderSelector = '[&_.koenig-lexical-editor-input-placeholder]';
const contentSelector = '[&_:is(p,blockquote,aside,ul,ol)]';

const baseEditorStyles = cn(
    // Base typography
    'text-[1.6rem] leading-[1.6] tracking-[-0.01em]',
    // Dark mode
    'dark:text-white dark:selection:bg-[rgba(88,101,116,0.99)]',
    // Placeholder styling
    `${placeholderSelector}:font-inter ${placeholderSelector}:text-xl ${placeholderSelector}:tracking-tight`,
    // Headings dark mode
    '[&_:is(h2,h3)]:dark:text-white',
    // Content typography
    `${contentSelector}:font-inter ${contentSelector}:text-xl ${contentSelector}:tracking-tight`,
    // Paragraph spacing & bold
    '[&_p]:mb-4 [&_strong]:font-semibold'
);

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
                className={cn(baseEditorStyles, className)}
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
