import * as Sentry from '@sentry/react';
import React, {Suspense, useCallback, useMemo} from 'react';
import {useDesignSystem, useFocusContext} from '../../providers/DesignSystemProvider';
import ErrorBoundary from '../ErrorBoundary';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FetchKoenigLexical = () => Promise<any>

export interface HtmlEditorProps {
    value?: string
    onChange?: (html: string) => void
    onBlur?: () => void
    placeholder?: string
    nodes?: 'DEFAULT_NODES' | 'BASIC_NODES' | 'MINIMAL_NODES'
    emojiPicker?: boolean;
    darkMode?: boolean;
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

const KoenigWrapper: React.FC<HtmlEditorProps & { editor: EditorResource }> = ({
    editor,
    value,
    onChange,
    onBlur,
    placeholder,
    nodes,
    emojiPicker = true,
    darkMode = false
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

    const handleSetHtml = (html: string) => {
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
    };

    return (
        <koenig.KoenigComposer
            darkMode={darkMode}
            nodes={koenig[nodes || 'DEFAULT_NODES']}
            onError={onError}
        >
            <koenig.KoenigComposableEditor
                className='koenig-lexical koenig-lexical-editor-input'
                isSnippetsEnabled={false}
                markdownTransformers={transformers[nodes || 'DEFAULT_NODES']}
                placeholderClassName='koenig-lexical-editor-input-placeholder line-clamp-1'
                placeholderText={placeholder}
                singleParagraph={true}
                onBlur={handleBlur}
                onFocus={handleFocus}
            >
                <koenig.HtmlOutputPlugin html={value} setHtml={handleSetHtml} />
                {emojiPicker ? <koenig.EmojiPickerPlugin /> : null}
            </koenig.KoenigComposableEditor>
        </koenig.KoenigComposer>
    );
};

const HtmlEditor: React.FC<HtmlEditorProps & {
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

export default HtmlEditor;
