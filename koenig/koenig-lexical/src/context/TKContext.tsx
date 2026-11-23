import React from 'react';
import throttle from 'lodash/throttle';
import type {NodeKey} from 'lexical';

// Sparse: only top-level nodes that contain TK nodes have an entry
export interface TKNodeMap {
    [topLevelNodeKey: NodeKey]: NodeKey[] | undefined;
}

type EditorTKNodeMap = Map<string, Map<NodeKey, {topLevelNodeKey: NodeKey}>>;

export interface TKContextValue {
    tkNodeMap: TKNodeMap;
    tkCount: number;
    addEditorTkNode: (editorKey: string, topLevelNodeKey: NodeKey, tkNodeKey: NodeKey) => void;
    removeEditorTkNode: (editorKey: string, tkNodeKey: NodeKey) => void;
    removeEditor: (editorKey: string) => void;
}

const noop = () => {};

const Context = React.createContext<TKContextValue>({
    tkNodeMap: {},
    tkCount: 0,
    addEditorTkNode: noop,
    removeEditorTkNode: noop,
    removeEditor: noop
});

export const TKContext = ({children}: {children: React.ReactNode}) => {
    // Map(
    //   editorKey: Map(
    //     tkNodeKey: {topLevelNodeKey}
    //   )
    // )
    //
    // We store under the editor key because a top level node (i.e. a decorator)
    // may contain multiple nested editors and it's easier for the plugin in each
    // editor to only know about it's own nodes
    const editorTkNodeMapRef = React.useRef<EditorTKNodeMap>(new Map());

    // node map used in top-level editor to display indicators
    const [tkNodeMap, setTkNodeMap] = React.useState<TKNodeMap>({});
    const [tkCount, setTkCount] = React.useState(0);

    // throttled update function to update the top-level node map
    //
    // this is throttled because the add/remove functions are called many times
    // in succession when the editor is opened or large blocks of TK-containing
    // content is added/removed (e.g. delete and undo)
    const updateTkNodeMap = React.useMemo(() => {
        const updateFn = () => {
            // derive a top-level tk node map to use for rendering indicators
            const editorTkNodeMap = editorTkNodeMapRef.current;

            const newTkNodeMap: TKNodeMap = {};
            let newTkCount = 0;

            editorTkNodeMap.forEach((nodeMap) => {
                nodeMap.forEach(({topLevelNodeKey}, tkNodeKey) => {
                    newTkCount = newTkCount + 1;

                    const tkNodeKeys = newTkNodeMap[topLevelNodeKey];

                    if (tkNodeKeys) {
                        tkNodeKeys.push(tkNodeKey);
                    } else {
                        newTkNodeMap[topLevelNodeKey] = [tkNodeKey];
                    }
                });
            });

            setTkNodeMap(newTkNodeMap);
            setTkCount(newTkCount);
        };

        return throttle(updateFn, 5, {trailing: true});
    }, []);

    const addEditorTkNode = React.useCallback((editorKey: string, topLevelNodeKey: NodeKey, tkNodeKey: NodeKey) => {
        const editorTkNodeMap = editorTkNodeMapRef.current;

        let nodeMap = editorTkNodeMap.get(editorKey);

        if (!nodeMap) {
            nodeMap = new Map();
            editorTkNodeMap.set(editorKey, nodeMap);
        }

        nodeMap.set(tkNodeKey, {topLevelNodeKey});

        updateTkNodeMap();
    }, [updateTkNodeMap]);

    const removeEditorTkNode = React.useCallback((editorKey: string, tkNodeKey: NodeKey) => {
        const editorTkNodeMap = editorTkNodeMapRef.current;

        editorTkNodeMap.get(editorKey)?.delete(tkNodeKey);

        if (editorTkNodeMap.get(editorKey)?.size === 0) {
            editorTkNodeMap.delete(editorKey);
        }

        updateTkNodeMap();
    }, [updateTkNodeMap]);

    const removeEditor = React.useCallback((editorKey: string) => {
        editorTkNodeMapRef.current.delete(editorKey);
        updateTkNodeMap();
    }, [updateTkNodeMap]);

    const contextValue = React.useMemo(() => {
        return {
            tkNodeMap,
            tkCount,
            addEditorTkNode,
            removeEditorTkNode,
            removeEditor
        };
    }, [
        tkNodeMap,
        tkCount,
        addEditorTkNode,
        removeEditorTkNode,
        removeEditor
    ]);

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useTKContext = () => React.useContext(Context);
