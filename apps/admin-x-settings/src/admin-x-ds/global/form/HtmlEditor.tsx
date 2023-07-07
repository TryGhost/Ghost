import React, {ReactNode, Suspense, useCallback, useMemo} from 'react';

export interface HtmlEditorProps {
    value?: string
    onChange?: (html: string) => void
    onBlur?: () => void
    placeholder?: string
    nodes?: 'DEFAULT_NODES' | 'BASIC_NODES' | 'MINIMAL_NODES';
}

declare global {
    interface Window {
        '@tryghost/koenig-lexical': any;
    }
}

const fetchKoenig = function ({editorUrl, editorVersion}: { editorUrl: string; editorVersion: string; }) {
    let status = 'pending';
    let response: any;

    const fetchPackage = async () => {
        if (window['@tryghost/koenig-lexical']) {
            return window['@tryghost/koenig-lexical'];
        }

        await import(editorUrl.replace('{version}', editorVersion));

        return window['@tryghost/koenig-lexical'];
    };

    const suspender = fetchPackage().then(
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

type EditorResource = ReturnType<typeof fetchKoenig>;

class ErrorHandler extends React.Component<{ children: ReactNode }> {
    state = {
        hasError: false
    };

    static getDerivedStateFromError() {
        return {hasError: true};
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error(error, errorInfo); // eslint-disable-line
    }

    render() {
        if (this.state.hasError) {
            return (
                <p className="koenig-react-editor-error">Loading has failed. Try refreshing the browser!</p>
            );
        }

        return this.props.children;
    }
}

const KoenigWrapper: React.FC<HtmlEditorProps & { editor: EditorResource }> = ({
    editor,
    value,
    onChange,
    onBlur,
    placeholder,
    nodes
}) => {
    const onError = useCallback((error: any) => {
        // ensure we're still showing errors in development
        console.error(error); // eslint-disable-line

        // Pass down Sentry from Ember?
        // if (this.config.sentry_dsn) {
        //     Sentry.captureException(error, {
        //         tags: {lexical: true},
        //         contexts: {
        //             koenig: {
        //                 version: window['@tryghost/koenig-lexical']?.version
        //             }
        //         }
        //     });
        // }
        // don't rethrow, Lexical will attempt to gracefully recover
    }, []);

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
                onBlur={onBlur}
            >
                <koenig.HtmlOutputPlugin html={value} setHtml={onChange} />
            </koenig.KoenigComposableEditor>
        </koenig.KoenigComposer>
    );
};

const HtmlEditor: React.FC<HtmlEditorProps & {
    config: { editor: { url: string; version: string; } };
    className?: string;
}> = ({
    config,
    className,
    ...props
}) => {
    const editorResource = useMemo(() => fetchKoenig({
        editorUrl: config.editor.url,
        editorVersion: config.editor.version
    }), [config.editor.url, config.editor.version]);

    return <div className={className || 'w-full'}>
        <div className="koenig-react-editor w-full [&_*]:!font-inherit [&_*]:!text-inherit">
            <ErrorHandler>
                <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                    <KoenigWrapper {...props} editor={editorResource} />
                </Suspense>
            </ErrorHandler>
        </div>
    </div>;
};

export default HtmlEditor;
