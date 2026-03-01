import React, {useCallback, useMemo} from 'react';
import useFeatureFlag from '../../../../hooks/use-feature-flag';
import {KoenigEditorBase, type KoenigInstance, LoadingIndicator} from '@tryghost/admin-x-design-system';
import {cn} from '@tryghost/shade';
import {koenigFileUploadTypes, useKoenigFileUpload} from '@tryghost/admin-x-framework/hooks';
import {useFramework} from '@tryghost/admin-x-framework';

export interface MemberEmailsEditorProps {
    value?: string;
    placeholder?: string;
    singleParagraph?: boolean;
    className?: string;
    onChange?: (value: string) => void;
}

const fileUploader = {
    useFileUpload: useKoenigFileUpload,
    fileTypes: koenigFileUploadTypes
};

const MemberEmailsEditor: React.FC<MemberEmailsEditorProps> = ({
    value,
    placeholder,
    singleParagraph = false,
    className,
    onChange
}) => {
    const welcomeEmailEditorEnabled = useFeatureFlag('welcomeEmailEditor');
    const {unsplashConfig} = useFramework();

    const cardConfig = useMemo(() => ({unsplash: unsplashConfig}), [unsplashConfig]);

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
        '[&_p]:mb-4 [&_strong]:font-semibold',
        // Nested-editor (callout, etc.) fixes: align placeholder with text
        // 1. Override placeholder font/size/line-height to match the <p> styles
        '[&_.not-kg-prose>div]:!font-inter [&_.not-kg-prose>div]:!tracking-tight [&_.not-kg-prose>div]:!text-xl [&_.not-kg-prose>div]:!leading-[1.6]',
        // 2. Remove paragraph bottom-margin inside nested editors so the
        //    placeholder translate-y lines up with the cursor
        '[&_.kg-inherit-styles_p]:!mb-0',
        // 3. Nudge nested editor text down to vertically align with the emoji
        '[&_.kg-inherit-styles]:!pt-[3px]'
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
                cardConfig={cardConfig}
                className={cn(baseEditorStyles, className)}
                emojiPicker={true}
                fileUploader={fileUploader}
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
                                <koenig.ImagePlugin />
                                <koenig.KoenigSelectorPlugin />
                            </>
                        )}

                    </>
                )}
            </KoenigEditorBase>
        </div>
    );
};

export default MemberEmailsEditor;
