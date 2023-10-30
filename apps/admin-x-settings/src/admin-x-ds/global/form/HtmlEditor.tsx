import * as Sentry from '@sentry/react';
import ErrorBoundary from '../ErrorBoundary';
import React, {Suspense, useCallback, useMemo} from 'react';
import {FetchKoenigLexical, useServices} from '../../../components/providers/ServiceProvider';
import {useFocusContext} from '../../providers/DesignSystemProvider';

export interface HtmlEditorProps {
    value?: string
    onChange?: (html: string) => void
    onBlur?: () => void
    placeholder?: string
    nodes?: 'DEFAULT_NODES' | 'BASIC_NODES' | 'MINIMAL_NODES';
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
    nodes
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
            nodes={koenig[nodes || 'DEFAULT_NODES']}
            onError={onError}
        >
            <koenig.KoenigComposableEditor
                className='koenig-lexical koenig-lexical-editor-input'
                darkMode={false}
                isSnippetsEnabled={false}
                markdownTransformers={transformers[nodes || 'DEFAULT_NODES']}
                placeholderClassName='koenig-lexical-editor-input-placeholder'
                placeholderText={placeholder}
                singleParagraph={true}
                onBlur={handleBlur}
                onFocus={handleFocus}
            >
                <koenig.HtmlOutputPlugin html={value} setHtml={handleSetHtml} />
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
    const {fetchKoenigLexical} = useServices();
    const editorResource = useMemo(() => loadKoenig(fetchKoenigLexical), [fetchKoenigLexical]);

    return <div className={className || 'w-full'}>
        <div className="koenig-react-editor w-full [&_*]:!font-inherit [&_*]:!text-inherit">
            <ErrorBoundary name='editor'>
                <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                    <KoenigWrapper {...props} editor={editorResource} />
                </Suspense>
            </ErrorBoundary>
        </div>
    </div>;
};

export default HtmlEditor;
