import React, {useCallback} from 'react';
import KoenigEditorBase, {type KoenigInstance, type NodeType} from './koenig-editor-base';

// Re-export for backwards compatibility
export type {FetchKoenigLexical} from './koenig-editor-base';

export interface HtmlEditorProps {
    value?: string
    onChange?: (html: string) => void
    onBlur?: () => void
    placeholder?: string
    nodes?: NodeType
    emojiPicker?: boolean;
    darkMode?: boolean;
    singleParagraph?: boolean;
    className?: string;
}

const HtmlEditor: React.FC<HtmlEditorProps> = ({
    value,
    onChange,
    singleParagraph = true,
    ...props
}) => {
    const handleSetHtml = useCallback((html: string) => {
        // Workaround for a bug in Lexical where it adds style attributes everywhere with white-space: pre-wrap
        // Likely related: https://github.com/facebook/lexical/issues/4255
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const elements = doc.querySelectorAll('*') as NodeListOf<HTMLElement>;

        elements.forEach((element) => {
            element.style.removeProperty('white-space');
            if (!element.getAttribute('style')) {
                element.removeAttribute('style');
            }
        });

        // Koenig sends this event on load without changing the value, so this prevents forms from being marked as unsaved
        if (doc.body.innerHTML !== value) {
            onChange?.(doc.body.innerHTML);
        }
    }, [value, onChange]);

    return (
        <KoenigEditorBase {...props} singleParagraph={singleParagraph}>
            {(koenig: KoenigInstance) => (
                <koenig.HtmlOutputPlugin html={value} setHtml={handleSetHtml} />
            )}
        </KoenigEditorBase>
    );
};

export default HtmlEditor;
