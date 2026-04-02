import React, {Suspense, useCallback, useMemo, useRef} from 'react';
import {ErrorBoundary, type KoenigInstance, LoadingIndicator, loadKoenig, useDesignSystem} from '@tryghost/admin-x-design-system';
import {cn} from '@tryghost/shade';
import {focusKoenigEditorOnBottomClick, useFramework} from '@tryghost/admin-x-framework';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {koenigFileUploadTypes, useKoenigFetchEmbed, useKoenigFileUpload, usePinturaConfig} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useWelcomeEmailLinkSuggestions} from '../../../../hooks/use-welcome-email-link-suggestions';

export interface MemberEmailsEditorProps {
    value?: string;
    placeholder?: string;
    className?: string;
    onChange?: (value: string) => void;
}

const fileUploader = {
    useFileUpload: useKoenigFileUpload,
    fileTypes: koenigFileUploadTypes
};

type EditorResource = ReturnType<typeof loadKoenig>;

const baseEditorStyles = cn(
    // Base typography
    'text-[1.6rem] leading-[1.6] tracking-[-0.01em] pb-10',
    // Dark mode
    'dark:text-white dark:selection:bg-[rgba(88,101,116,0.99)]',
    // Placeholder styling
    '[&_.koenig-lexical-editor-input-placeholder]:font-inter [&_.koenig-lexical-editor-input-placeholder]:text-xl [&_.koenig-lexical-editor-input-placeholder]:tracking-tight',
    // Headings dark mode
    '[&_:is(h2,h3)]:dark:text-white',
    // Inputs
    '[&_.koenig-lexical_input]:text-[1.4rem]',
    // Plus icon
    '[&_[data-kg-plus-button]]:top-[-4px]',
    // Settings panel
    '[&_[data-kg-card-selected]]:isolate',
    // Content typography
    '[&_:is(p,blockquote,aside,ul,ol)]:font-inter [&_:is(p,blockquote,aside,ul,ol)]:text-xl [&_:is(p,blockquote,aside,ul,ol)]:tracking-tight',
    // Reset content typography inside card captions to match Koenig's caption styles
    '[&_figcaption_:is(p,blockquote,aside,ul,ol)]:text-[1.4rem] [&_figcaption_:is(p,blockquote,aside,ul,ol)]:tracking-[.025em]',
    '[&_figcaption_p]:mb-0',
    '[&_:is(h1)]:text-[36px] [&_:is(h2)]:text-[32px] [&_:is(h3)]:text-[26px] [&_:is(h4)]:text-[21px] [&_:is(h5)]:text-[19px] [&_:is(h6)]:text-[19px] [&_:is(h1,h2,h3,h4,h5,h6)]:mb-[0.5em]',
    // Horizontal ruler
    '[&_:is(hr)]:pt-0',
    // Paragraph spacing & bold
    '[&_p]:mb-4 [&_strong]:font-semibold',
    // Keep settings panel copy compact
    '[&_[data-kg-settings-panel]_p]:!mb-0',
    // Nested-editor (callout, etc.) fixes: align placeholder with text
    '[&_.not-kg-prose>div]:font-inter! [&_.not-kg-prose>div]:tracking-tight! [&_.not-kg-prose>div]:text-xl! [&_.not-kg-prose>div]:leading-[1.6]!',
    '[&_.kg-inherit-styles_p]:mb-0!',
    '[&_.kg-inherit-styles]:pt-[3px]!',
    // CTA card: keep sponsor label at its intended 12.5px size
    '[&_.koenig-lexical-cta-label_p]:!text-[12.5px]'
);

// Inner component that reads the lazy-loaded Koenig resource
const EmailEditorInner: React.FC<{
    editor: EditorResource;
    darkMode: boolean;
    cardConfig: unknown;
    initialEditorState?: string;
    placeholder?: string;
    className?: string;
    registerAPI: (API: KoenigInstance | null) => void;
    onChange: (data: unknown) => void;
}> = ({editor, darkMode, cardConfig, initialEditorState, placeholder, className, registerAPI, onChange}) => {
    const koenig = editor.read();
    const EmailEditor = koenig.EmailEditor;

    return (
        <div className={cn('koenig-react-editor w-full', baseEditorStyles, className)}>
            <EmailEditor
                cardConfig={cardConfig}
                className="koenig-lexical koenig-lexical-editor-input"
                darkMode={darkMode}
                fileUploader={fileUploader}
                initialEditorState={initialEditorState}
                placeholderText={placeholder}
                registerAPI={registerAPI}
                onChange={onChange}
            />
        </div>
    );
};

const MemberEmailsEditor: React.FC<MemberEmailsEditorProps> = ({
    value,
    placeholder,
    className,
    onChange
}) => {
    const editorAPIRef = useRef<KoenigInstance | null>(null);
    // Capture the initial value once — the editor owns its own state after mount
    const initialEditorState = useRef(value);
    const {unsplashConfig} = useFramework();
    const pinturaConfig = usePinturaConfig();
    const {config, settings} = useGlobalData();
    const {fetchAutocompleteLinks, searchLinks} = useWelcomeEmailLinkSuggestions();
    const fetchEmbed = useKoenigFetchEmbed();
    const tenorConfig = config.tenor?.googleApiKey ? config.tenor : null;
    const {fetchKoenigLexical, darkMode} = useDesignSystem();
    const editorResource = useMemo(() => loadKoenig(fetchKoenigLexical), [fetchKoenigLexical]);
    const [transistorEnabled] = getSettingValues<boolean>(settings, ['transistor']);

    const cardConfig = useMemo(() => ({
        unsplash: unsplashConfig,
        pinturaConfig,
        tenor: tenorConfig,
        fetchEmbed,
        fetchAutocompleteLinks,
        searchLinks,
        feature: {
            transistor: transistorEnabled
        },
        visibilitySettings: 'none'
    }), [unsplashConfig, pinturaConfig, tenorConfig, fetchEmbed, fetchAutocompleteLinks, searchLinks, transistorEnabled]);

    const registerEditorAPI = useCallback((API: KoenigInstance | null) => {
        editorAPIRef.current = API;
    }, []);

    // Koenig's onChange passes the Lexical state as a plain object,
    // but the API expects a JSON string
    const handleChange = useCallback((data: unknown) => {
        if (onChange && data && typeof data === 'object') {
            onChange(JSON.stringify(data));
        }
    }, [onChange]);

    // Stop Cmd+K from bubbling to global search handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.stopPropagation();
        }
    }, []);

    const handleEditorMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!editorAPIRef.current) {
            return;
        }
        focusKoenigEditorOnBottomClick(editorAPIRef.current, event);
    };

    return (
        <div className="h-full" onKeyDown={handleKeyDown} onMouseDown={handleEditorMouseDown}>
            <ErrorBoundary name="email-editor">
                <Suspense fallback={<LoadingIndicator delay={200} size="lg" />}>
                    <EmailEditorInner
                        cardConfig={cardConfig}
                        className={className}
                        darkMode={darkMode}
                        editor={editorResource}
                        initialEditorState={initialEditorState.current}
                        placeholder={placeholder}
                        registerAPI={registerEditorAPI}
                        onChange={handleChange}
                    />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
};

export default React.memo(MemberEmailsEditor);
