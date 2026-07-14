import React, {Suspense, useCallback, useMemo, useRef} from 'react';
import type {ComponentType} from 'react';
import {LoadingIndicator} from '@tryghost/shade/components';
import {cn} from '@tryghost/shade/utils';
import {focusKoenigEditorOnBottomClick, useFramework} from '@tryghost/admin-x-framework';
import {getSettingValues, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {koenigFileUploadTypes, useKoenigFetchEmbed, useKoenigFileUpload, usePinturaConfig} from '@tryghost/admin-x-framework/hooks';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useEmailLinkSuggestions} from './use-link-suggestions';
import {useFocusContext} from '@tryghost/shade/app';

export interface EmailEditorProps {
    value?: string;
    placeholder?: string;
    className?: string;
    onChange?: (value: string) => void;
}

// The editor API handle, typed as whatever focusKoenigEditorOnBottomClick accepts.
type KoenigAPI = Parameters<typeof focusKoenigEditorOnBottomClick>[0];

const fileUploader = {
    useFileUpload: useKoenigFileUpload,
    fileTypes: koenigFileUploadTypes
};

// @tryghost/koenig-lexical ships no type declarations, so its runtime module
// resolves as `any`. Declare just the EmailEditor surface we use so the lazy
// component keeps its props under Admin's stricter type-checking.
interface KoenigEmailEditorProps {
    cardConfig?: unknown;
    className?: string;
    darkMode?: boolean;
    fileUploader?: unknown;
    initialEditorState?: string;
    placeholderText?: string;
    registerAPI?: (api: unknown) => void;
    onChange?: (state: unknown) => void;
}

// Lazy-load the editor as its own chunk; the ESM import lets Vite dedupe React.
const EmailEditorComponent = React.lazy(async () => {
    const module = await import('@tryghost/koenig-lexical') as {EmailEditor: ComponentType<KoenigEmailEditorProps>};
    return {default: module.EmailEditor};
});

// Inline fallback if the editor chunk fails to load — kept lightweight so a
// failure shows inside the modal rather than replacing the whole view.
class EditorErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
    state = {hasError: false};

    static getDerivedStateFromError() {
        return {hasError: true};
    }

    render() {
        if (this.state.hasError) {
            return <div className='p-6 text-sm text-destructive'>Something went wrong loading the editor.</div>;
        }
        return this.props.children;
    }
}

const baseEditorStyles = cn(
    // Base typography
    'pb-10 text-[1.6rem] leading-[1.6] tracking-[-0.01em]',
    // Dark mode
    'dark:text-white dark:selection:bg-[rgba(88,101,116,0.99)]',
    // Placeholder styling
    '[&_.koenig-lexical-editor-input-placeholder]:font-sans! [&_.koenig-lexical-editor-input-placeholder]:text-[1.6rem] [&_.koenig-lexical-editor-input-placeholder]:tracking-tight',
    // Headings dark mode
    '[&_:is(h2,h3)]:dark:text-white',
    // Inputs
    '[&_.koenig-lexical_input]:text-[1.4rem]',
    // Plus icon
    '[&_[data-kg-plus-button]]:top-[-4px]',
    // Settings panel
    '[&_[data-kg-card-selected]]:isolate',
    // Content typography
    '[&_:is(p,blockquote,aside,ul,ol)]:tracking-tight',
    // Reset content typography inside card captions to match Koenig's caption styles
    '[&_figcaption_:is(p,blockquote,aside,ul,ol)]:text-[1.4rem] [&_figcaption_:is(p,blockquote,aside,ul,ol)]:tracking-[.025em]',
    '[&_figcaption_p]:mb-0',
    '[&_:is(h1)]:text-[36px] [&_:is(h1,h2,h3,h4,h5,h6)]:mb-[0.5em] [&_:is(h2)]:text-[32px] [&_:is(h3)]:text-[26px] [&_:is(h4)]:text-[21px] [&_:is(h5)]:text-[19px] [&_:is(h6)]:text-[19px]',
    // Horizontal ruler
    '[&_:is(hr)]:pt-0',
    // Paragraph spacing & bold
    '[&_p]:mb-4 [&_strong]:font-semibold',
    // Keep settings panel copy compact
    '[&_[data-kg-settings-panel]_p]:!mb-0',
    // Nested-editor (callout, etc.) fixes: align placeholder with text
    '[&_.not-kg-prose>div]:font-sans! [&_.not-kg-prose>div]:text-[1.6rem]! [&_.not-kg-prose>div]:leading-[1.6]! [&_.not-kg-prose>div]:tracking-tight!',
    '[&_.kg-inherit-styles_p]:mb-0!',
    '[&_.kg-inherit-styles]:pt-[3px]!',
    // CTA card: keep sponsor label at its intended 12.5px size
    '[&_.koenig-lexical-cta-label_p]:!text-[12.5px]'
);

const EmailEditor: React.FC<EmailEditorProps> = ({
    value,
    placeholder,
    className,
    onChange
}) => {
    const editorAPIRef = useRef<KoenigAPI | null>(null);
    // Capture the initial value once — the editor owns its own state after mount
    const initialEditorState = useRef(value);
    const {darkMode} = useFocusContext();
    const {unsplashConfig} = useFramework();
    const pinturaConfig = usePinturaConfig();
    const {data: settingsData} = useBrowseSettings();
    const {data: configData} = useBrowseConfig();
    const settings = settingsData?.settings || [];
    const config = configData?.config;
    const {fetchAutocompleteLinks, searchLinks} = useEmailLinkSuggestions();
    const fetchEmbed = useKoenigFetchEmbed();
    const klipyConfig = config?.klipy?.apiKey ? config.klipy : null;
    const [transistorEnabled] = getSettingValues<boolean>(settings, ['transistor']);

    const cardConfig = useMemo(() => ({
        unsplash: unsplashConfig,
        pinturaConfig,
        klipy: klipyConfig,
        fetchEmbed,
        fetchAutocompleteLinks,
        searchLinks,
        feature: {
            transistor: transistorEnabled
        },
        visibilitySettings: 'none'
    }), [unsplashConfig, pinturaConfig, klipyConfig, fetchEmbed, fetchAutocompleteLinks, searchLinks, transistorEnabled]);

    const registerEditorAPI = useCallback((api: unknown) => {
        editorAPIRef.current = api as KoenigAPI | null;
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
            <EditorErrorBoundary>
                <Suspense fallback={<LoadingIndicator size='lg' />}>
                    <div className={cn('koenig-react-editor w-full', baseEditorStyles, className)}>
                        <EmailEditorComponent
                            cardConfig={cardConfig}
                            className="koenig-lexical koenig-lexical-editor-input"
                            darkMode={darkMode}
                            fileUploader={fileUploader}
                            initialEditorState={initialEditorState.current}
                            placeholderText={placeholder}
                            registerAPI={registerEditorAPI}
                            onChange={handleChange}
                        />
                    </div>
                </Suspense>
            </EditorErrorBoundary>
        </div>
    );
};

export default React.memo(EmailEditor);
