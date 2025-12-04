import * as Sentry from '@sentry/react';
import React, {Suspense, useCallback, useMemo} from 'react';
import {useDesignSystem, useFocusContext} from '../../providers/DesignSystemProvider';
import ErrorBoundary from '../ErrorBoundary';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FetchKoenigLexical = () => Promise<any>

export interface LexicalEditorProps {
    value?: string
    onChange?: (lexical: string) => void
    onBlur?: () => void
    placeholder?: string
    nodes?: 'DEFAULT_NODES' | 'BASIC_NODES' | 'MINIMAL_NODES'
    emojiPicker?: boolean;
    darkMode?: boolean;
    singleParagraph?: boolean;
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        '@tryghost/koenig-lexical': any;
    }
}

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

const KoenigWrapper: React.FC<LexicalEditorProps & { editor: EditorResource }> = ({
    editor,
    value,
    onChange,
    onBlur,
    placeholder,
    nodes,
    emojiPicker = true,
    darkMode = false,
    singleParagraph = false
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
    const koenig = useMemo(() => new Proxy({} as { [key: string]: any }, {
        get: (_target, prop) => {
            return editor.read()[prop];
        }
    }), [editor]);

    const transformers = {
        DEFAULT_NODES: koenig.DEFAULT_TRANSFORMERS,
        BASIC_NODES: koenig.BASIC_TRANSFORMERS,
        MINIMAL_NODES: koenig.MINIMAL_TRANSFORMERS
    };

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
        <koenig.KoenigComposer
            darkMode={darkMode}
            initialEditorState={initialEditorState}
            nodes={koenig[nodes || 'BASIC_NODES']}
            onError={onError}
        >
            <koenig.KoenigComposableEditor
                className='koenig-lexical koenig-lexical-editor-input'
                isSnippetsEnabled={false}
                markdownTransformers={transformers[nodes || 'BASIC_NODES']}
                placeholderClassName='koenig-lexical-editor-input-placeholder line-clamp-1'
                placeholderText={placeholder}
                singleParagraph={singleParagraph}
                onBlur={handleBlur}
                onChange={handleChange}
                onFocus={handleFocus}
            >
                {emojiPicker ? <koenig.EmojiPickerPlugin /> : null}
            </koenig.KoenigComposableEditor>
        </koenig.KoenigComposer>
    );
};

const LexicalEditor: React.FC<LexicalEditorProps & {
    className?: string;
}> = ({
    className,
    ...props
}) => {
    const {fetchKoenigLexical, darkMode} = useDesignSystem();
    const editorResource = useMemo(() => loadKoenig(fetchKoenigLexical), [fetchKoenigLexical]);

    return <div className={className || 'w-full'}>
        <div className="koenig-react-editor w-full [&_*]:!font-inherit [&_*]:!text-inherit">
            <ErrorBoundary name='editor'>
                <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                    <KoenigWrapper {...props} darkMode={darkMode} editor={editorResource} />
                </Suspense>
            </ErrorBoundary>
        </div>
    </div>;
};

export default LexicalEditor;
