import React, {useCallback} from 'react';
import useFeatureFlag from '../../../../hooks/use-feature-flag';
import {KoenigEditorBase, type KoenigInstance, LoadingIndicator} from '@tryghost/admin-x-design-system';
import {cn} from '@tryghost/shade';

export interface MemberEmailsEditorProps {
    value?: string;
    placeholder?: string;
    singleParagraph?: boolean;
    className?: string;
    onChange?: (value: string) => void;
}

const MemberEmailsEditor: React.FC<MemberEmailsEditorProps> = ({
    value,
    placeholder,
    singleParagraph = false,
    className,
    onChange
}) => {
    const welcomeEmailEditorEnabled = useFeatureFlag('welcomeEmailEditor');
    const baseEditorStyles = cn(
        // Base typography
        'text-[1.6rem] leading-[1.6] tracking-[-0.01em]',
        // Dark mode
        'dark:text-white dark:selection:bg-[rgba(88,101,116,0.99)]',
        // Placeholder styling
        '[&_.koenig-lexical-editor-input-placeholder]:font-inter [&_.koenig-lexical-editor-input-placeholder]:text-xl [&_.koenig-lexical-editor-input-placeholder]:tracking-tight',
        // Headings dark mode
        '[&_:is(h2,h3)]:dark:text-white',

        // Content typography
        '[&_:is(p,blockquote,aside,ul,ol)]:font-inter [&_:is(p,blockquote,aside,ul,ol)]:text-xl [&_:is(p,blockquote,aside,ul,ol)]:tracking-tight',
        '[&_:is(h1)]:text-[36px] [&_:is(h2)]:text-[32px] [&_:is(h3)]:text-[26px] [&_:is(h4)]:text-[21px] [&_:is(h5)]:text-[19px] [&_:is(h6)]:text-[19px] [&_:is(h1,h2,h3,h4,h5,h6)]:mb-[0.5em]',
        // Horizontal ruler
        '[&_:is(hr)]:pt-0',
        // Paragraph spacing & bold
        '[&_p]:mb-4 [&_strong]:font-semibold'
    );

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
                emojiPicker={true}
                inheritFontStyles={false}
                initialEditorState={value}
                loadingFallback={<LoadingIndicator delay={200} size="lg" />}
                nodes={welcomeEmailEditorEnabled ? 'EMAIL_EDITOR_NODES' : 'EMAIL_NODES'}
                placeholder={placeholder}   
                singleParagraph={singleParagraph}
                onChange={handleChange}
            >
                {(koenig: KoenigInstance) => (
                    <>
                        <koenig.EmEnDashPlugin />
                        <koenig.HorizontalRulePlugin />
                        <koenig.ListPlugin />
                        <koenig.ReplacementStringsPlugin />

                        {welcomeEmailEditorEnabled && (
                            <>
                                <koenig.BookmarkPlugin />
                                <koenig.ButtonPlugin />
                                <koenig.CalloutPlugin />
                                <koenig.CardMenuPlugin />
                                <koenig.EmailCtaPlugin />
                                <koenig.HtmlPlugin />
                                <koenig.KoenigSelectorPlugin />
                                {/* TODO: we need to wire up card config to enable snippets */}
                                {/* <koenig.KoenigSnippetPlugin /> */}
                                {/* TODO: we need to wire up a fileUploader prop + fileUploadHook to enable files+images */}
                                {/* <koenig.FilePlugin /> */}
                                {/* <koenig.ImagePlugin /> */}
                            </>
                        )}

                    </>
                )}
            </KoenigEditorBase>
        </div>
    );
};

export default MemberEmailsEditor;
