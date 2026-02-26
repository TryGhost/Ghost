import * as Sentry from '@sentry/react';
import React, {Suspense, useCallback, useMemo} from 'react';
import {useDesignSystem, useFocusContext} from '../../providers/design-system-provider';
import ErrorBoundary from '../error-boundary';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FetchKoenigLexical = () => Promise<any>

export type NodeType = 'DEFAULT_NODES' | 'BASIC_NODES' | 'MINIMAL_NODES' | 'EMAIL_NODES' | 'EMAIL_EDITOR_NODES';

export interface KoenigEditorBaseProps {
    onBlur?: () => void
    placeholder?: string
    nodes?: NodeType
    emojiPicker?: boolean
    darkMode?: boolean
    singleParagraph?: boolean
    className?: string
    inheritFontStyles?: boolean
    loadingFallback?: React.ReactNode
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        '@tryghost/koenig-lexical': any;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KoenigInstance = { [key: string]: any };

const loadKoenig = function (fetchKoenigLexical: FetchKoenigLexical) {
    let status = 'pending';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any;

    const suspender = fetchKoenigLexical().then(
        (res) => {
            status = 'success';
            response = res;
        },
        (err) => {
            status = 'error';
            response = err;
        }
    );

    const read = () => {
        switch (status) {
        case 'pending':
            throw suspender;
        case 'error':
            throw response;
        default:
            return response;
        }
    };

    return {read};
};

type EditorResource = ReturnType<typeof loadKoenig>;

interface KoenigWrapperProps extends KoenigEditorBaseProps {
    editor: EditorResource
    // For HtmlEditor: render prop that returns HtmlOutputPlugin
    // For MinimalEditor: render prop that returns null (uses native onChange)
    children: (koenig: KoenigInstance) => React.ReactNode
    // For MinimalEditor: initial lexical state
    initialEditorState?: string
    // For MinimalEditor: native onChange handler
    onChange?: (editorState: unknown) => void
}

export const KoenigWrapper: React.FC<KoenigWrapperProps> = ({
    editor,
    onBlur,
    placeholder,
    nodes,
    emojiPicker = true,
    darkMode = false,
    singleParagraph = false,
    children,
    initialEditorState,
    onChange
}) => {
    const onError = useCallback((error: unknown) => {
        try {
            Sentry.captureException({
                error,
                tags: {lexical: true},
                contexts: {
                    koenig: {
                        version: window['@tryghost/koenig-lexical']?.version
                    }
                }
            });
        } catch (e) {
            // if this fails, Sentry is probably not initialized
            console.error(e); // eslint-disable-line
        }
        console.error(error); // eslint-disable-line
    }, []);
    const {setFocusState} = useFocusContext();

    const handleBlur = () => {
        if (onBlur) {
            onBlur();
        }
        setFocusState(false);
    };

    const handleFocus = () => {
        setFocusState(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const koenig = useMemo(() => new Proxy({} as KoenigInstance, {
        get: (_target, prop) => {
            return editor.read()[prop];
        }
    }), [editor]);

    const transformers = {
        DEFAULT_NODES: koenig.DEFAULT_TRANSFORMERS,
        BASIC_NODES: koenig.BASIC_TRANSFORMERS,
        MINIMAL_NODES: koenig.MINIMAL_TRANSFORMERS,
        EMAIL_NODES: koenig.EMAIL_TRANSFORMERS,
        EMAIL_EDITOR_NODES: koenig.EMAIL_TRANSFORMERS
    };

    const defaultNodes = nodes || 'DEFAULT_NODES';

    return (
        <koenig.KoenigComposer
            darkMode={darkMode}
            initialEditorState={initialEditorState}
            nodes={koenig[defaultNodes]}
            onError={onError}
        >
            <koenig.KoenigComposableEditor
                className='koenig-lexical koenig-lexical-editor-input'
                isSnippetsEnabled={false}
                markdownTransformers={transformers[defaultNodes]}
                placeholderClassName='koenig-lexical-editor-input-placeholder line-clamp-1'
                placeholderText={placeholder}
                singleParagraph={singleParagraph}
                onBlur={handleBlur}
                onChange={onChange}
                onFocus={handleFocus}
            >
                {children(koenig)}
                {emojiPicker ? <koenig.EmojiPickerPlugin /> : null}
            </koenig.KoenigComposableEditor>
        </koenig.KoenigComposer>
    );
};

interface KoenigEditorBaseInternalProps extends KoenigEditorBaseProps {
    children: (koenig: KoenigInstance) => React.ReactNode
    initialEditorState?: string
    onChange?: (editorState: unknown) => void
}

const KoenigEditorBase: React.FC<KoenigEditorBaseInternalProps> = ({
    className,
    children,
    initialEditorState,
    onChange,
    inheritFontStyles = true,
    loadingFallback,
    ...props
}) => {
    const {fetchKoenigLexical, darkMode} = useDesignSystem();
    const editorResource = useMemo(() => loadKoenig(fetchKoenigLexical), [fetchKoenigLexical]);
    const inheritClasses = inheritFontStyles ? '[&_*]:!font-inherit [&_*]:!text-inherit' : '';

    return (
        <div className={className || 'w-full'}>
            <div className={`koenig-react-editor w-full ${inheritClasses}`}>
                <ErrorBoundary name='editor'>
                    <Suspense fallback={loadingFallback || <p className="koenig-react-editor-loading">Loading editor...</p>}>
                        <KoenigWrapper
                            {...props}
                            darkMode={darkMode}
                            editor={editorResource}
                            initialEditorState={initialEditorState}
                            onChange={onChange}
                        >
                            {children}
                        </KoenigWrapper>
                    </Suspense>
                </ErrorBoundary>
            </div>
        </div>
    );
};

export default KoenigEditorBase;
