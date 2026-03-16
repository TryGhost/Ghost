import DEFAULT_NODES from '../nodes/DefaultNodes';
import KoenigComposerContext, {defaultFileUploader} from '../context/KoenigComposerContext';
import React from 'react';
import defaultTheme from '../themes/default';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {DEFAULT_CONFIG} from '@tryghost/kg-default-nodes';
import {Doc} from 'yjs';
import {KoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {TKContext} from '../context/TKContext';
import {WebsocketProvider} from 'y-websocket';
import type {CardConfig, FileUploader} from '../context/KoenigComposerContext';
import type {Klass, LexicalNode} from 'lexical';
import type {LexicalNodeReplacement} from 'lexical';

type KoenigFileUploaderProp = Partial<FileUploader> & Record<string, unknown>;

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function defaultOnError(error: Error) {
    console.error(error);
}

const defaultConfig = {
    namespace: 'KoenigEditor',
    theme: defaultTheme,
    html: DEFAULT_CONFIG.html
};

export interface KoenigComposerProps {
    initialEditorState?: string | Record<string, unknown>;
    nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>;
    onError?: (error: Error) => void;
    fileUploader?: KoenigFileUploaderProp;
    cardConfig?: CardConfig;
    darkMode?: boolean;
    enableMultiplayer?: boolean;
    isTKEnabled?: boolean;
    multiplayerEndpoint?: string;
    multiplayerDebug?: boolean;
    multiplayerDocId?: string;
    multiplayerUsername?: string;
    children?: React.ReactNode;
}

const KoenigComposer = ({
    initialEditorState,
    nodes = [...DEFAULT_NODES] as ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>,
    onError = defaultOnError,
    fileUploader,
    cardConfig = {},
    darkMode = false,
    enableMultiplayer = false,
    isTKEnabled,
    multiplayerEndpoint,
    multiplayerDebug = true,
    multiplayerDocId,
    multiplayerUsername,
    children
}: KoenigComposerProps) => {
    const initialConfig = React.useMemo(() => {
        let editorState: string | undefined;

        // root needs to have at least one paragraph node for the editor to work
        if (initialEditorState) {
            let parsed: Record<string, unknown>;
            if (typeof initialEditorState === 'string') {
                parsed = JSON.parse(initialEditorState);
            } else {
                parsed = initialEditorState;
            }

            const root = parsed.root as {children: unknown[]} | undefined;
            if (root?.children?.length === 0) {
                root.children.push({
                    children: [],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                });
            }

            editorState = JSON.stringify(parsed);
        }

        return Object.assign({}, defaultConfig, {
            nodes,
            editorState: enableMultiplayer ? null : editorState,
            onError
        });
    }, [enableMultiplayer, initialEditorState, nodes, onError]);

    const editorContainerRef = React.useRef<HTMLElement | null>(null);
    const onWordCountChangeRef = React.useRef<((counts: unknown) => void) | null>(null);
    const normalizedFileUploader = React.useMemo<FileUploader>(() => ({
        ...defaultFileUploader,
        ...fileUploader,
        fileTypes: fileUploader?.fileTypes ?? defaultFileUploader.fileTypes,
        useFileUpload: fileUploader?.useFileUpload ?? defaultFileUploader.useFileUpload
    }), [fileUploader]);

    const createWebsocketProvider = React.useCallback((id: string, yjsDocMap: Map<string, Doc>) => {
        let doc = yjsDocMap.get(id);

        if (doc === undefined) {
            doc = new Doc();
            yjsDocMap.set(id, doc);
        } else {
            doc.load();
        }

        if (!multiplayerEndpoint) {
            throw new Error('KoenigComposer: multiplayerEndpoint is required when multiplayer is enabled');
        }

        const provider = new WebsocketProvider(
            multiplayerEndpoint,
            (multiplayerDocId || '') + '/' + id,
            doc,
            {connect: false}
        );

        if (multiplayerDebug) {
            provider.on('status', (event: {status: string}) => {

                console.log(event.status, `id: ${multiplayerDocId || ''}/${id}`); // logs "connected" or "disconnected"
            });
        }

        return provider;
    }, [multiplayerEndpoint, multiplayerDocId, multiplayerDebug]);

    return (
        <LexicalComposer initialConfig={initialConfig as Parameters<typeof LexicalComposer>[0]['initialConfig']}>
            <KoenigComposerContext.Provider value={{
                fileUploader: normalizedFileUploader,
                editorContainerRef,
                cardConfig,
                darkMode,
                enableMultiplayer,
                isTKEnabled,
                multiplayerEndpoint,
                multiplayerDocId,
                multiplayerUsername,
                createWebsocketProvider,
                onWordCountChangeRef
            }}>
                <KoenigSelectedCardContext>
                    <TKContext>
                        {enableMultiplayer ? (
                            <CollaborationPlugin
                                id="main"
                                initialEditorState={initialEditorState as string | undefined}
                                providerFactory={createWebsocketProvider as unknown as Parameters<typeof CollaborationPlugin>[0]['providerFactory']}
                                shouldBootstrap={true}
                                username={multiplayerUsername}
                            />
                        ) : null}
                        {children}
                    </TKContext>
                </KoenigSelectedCardContext>
            </KoenigComposerContext.Provider>
        </LexicalComposer>
    );
};

export default KoenigComposer;
