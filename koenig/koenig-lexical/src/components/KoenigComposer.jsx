import DEFAULT_NODES from '../nodes/DefaultNodes';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import defaultTheme from '../themes/default';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {Doc} from 'yjs';
import {KoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {WebsocketProvider} from 'y-websocket';

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function defaultOnError(error) {
    console.error(error); // eslint-disable-line
}

const defaultConfig = {
    namespace: 'KoenigEditor',
    theme: defaultTheme
};

const KoenigComposer = ({
    initialEditorState,
    nodes = [...DEFAULT_NODES],
    onError = defaultOnError,
    fileUploader = {},
    cardConfig = {},
    darkMode = false,
    enableMultiplayer = false,
    multiplayerEndpoint,
    multiplayerDebug = true,
    multiplayerDocId,
    multiplayerUsername,
    children
}) => {
    const initialConfig = React.useMemo(() => {
        return Object.assign({}, defaultConfig, {
            nodes,
            editorState: enableMultiplayer ? null : initialEditorState,
            onError
        });
    }, [enableMultiplayer, initialEditorState, nodes, onError]);

    const editorContainerRef = React.useRef(null);

    if (!fileUploader.useFileUpload) {
        fileUploader.useFileUpload = function () {
            console.error('<KoenigComposer> requires a `fileUploader` prop object to be passed containing a `useFileUpload` custom hook'); // eslint-disable-line no-console
            return;
        };
    }

    const createWebsocketProvider = React.useCallback((id, yjsDocMap) => {
        let doc = yjsDocMap.get(id);

        if (doc === undefined) {
            doc = new Doc();
            yjsDocMap.set(id, doc);
        } else {
            doc.load();
        }

        const provider = new WebsocketProvider(
            multiplayerEndpoint,
            multiplayerDocId + '/' + id,
            doc,
            {connect: false}
        );

        if (multiplayerDebug) {
            provider.on('status', (event) => {
                // eslint-disable-next-line no-console
                console.log(event.status, `id: ${multiplayerDocId}/${id}`); // logs "connected" or "disconnected"
            });
        }

        return provider;
    }, [multiplayerEndpoint, multiplayerDocId, multiplayerDebug]);

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <KoenigComposerContext.Provider value={{
                fileUploader,
                editorContainerRef,
                cardConfig,
                darkMode,
                enableMultiplayer,
                multiplayerEndpoint,
                multiplayerDocId,
                multiplayerUsername,
                createWebsocketProvider
            }}>
                <KoenigSelectedCardContext>
                    {enableMultiplayer ? (
                        <CollaborationPlugin
                            id="main"
                            initialEditorState={initialEditorState}
                            providerFactory={createWebsocketProvider}
                            shouldBootstrap={true}
                            username={multiplayerUsername}
                        />
                    ) : null}
                    {children}
                </KoenigSelectedCardContext>
            </KoenigComposerContext.Provider>
        </LexicalComposer>
    );
};

export default KoenigComposer;
