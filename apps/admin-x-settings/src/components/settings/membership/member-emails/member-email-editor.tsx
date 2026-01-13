import * as Sentry from '@sentry/react';
import React, {Suspense, useCallback, useMemo} from 'react';
import {ErrorBoundary, useDesignSystem, useFocusContext} from '@tryghost/admin-x-design-system';
import {type EditorResource, koenigFileUploader, loadKoenig} from '@tryghost/admin-x-framework';

export interface MemberEmailsEditorProps {
    value?: string;
    placeholder?: string;
    className?: string;
    onChange?: (value: string) => void;
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        '@tryghost/koenig-lexical': any;
    }
}

interface KoenigEmailEditorWrapperProps {
    editor: EditorResource;
    initialEditorState?: string;
    placeholder?: string;
    darkMode?: boolean;
    onChange?: (editorState: unknown) => void;
}

const KoenigEmailEditorWrapper: React.FC<KoenigEmailEditorWrapperProps> = ({
    editor,
    initialEditorState,
    placeholder,
    darkMode = false,
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
        setFocusState(false);
    };

    const handleFocus = () => {
        setFocusState(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const koenig = useMemo(() => new Proxy({} as {[key: string]: any}, {
        get: (_target, prop) => {
            return editor.read()[prop];
        }
    }), [editor]);

    return (
        <koenig.KoenigComposer
            darkMode={darkMode}
            fileUploader={koenigFileUploader}
            initialEditorState={initialEditorState}
            nodes={koenig.EMAIL_NODES}
            onError={onError}
        >
            <koenig.KoenigEmailEditor
                placeholderText={placeholder}
                onBlur={handleBlur}
                onChange={onChange}
                onFocus={handleFocus}
            />
        </koenig.KoenigComposer>
    );
};

const MemberEmailsEditor: React.FC<MemberEmailsEditorProps> = ({
    value,
    placeholder,
    className,
    onChange
}) => {
    const {fetchKoenigLexical, darkMode} = useDesignSystem();
    const editorResource = useMemo(() => loadKoenig(fetchKoenigLexical), [fetchKoenigLexical]);

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

    return (
        <div className={className || 'w-full'}>
            <div className="koenig-react-editor w-full">
                <ErrorBoundary name='editor'>
                    <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                        <KoenigEmailEditorWrapper
                            darkMode={darkMode}
                            editor={editorResource}
                            initialEditorState={value}
                            placeholder={placeholder}
                            onChange={handleChange}
                        />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </div>
    );
};

export default MemberEmailsEditor;
