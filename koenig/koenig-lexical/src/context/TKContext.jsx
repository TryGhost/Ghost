import React from 'react';
import throttle from 'lodash/throttle';

const Context = React.createContext({});

export const TKContext = ({children}) => {
    // Map(
    //   editorKey: Map(
    //     tkNodeKey: {topLevelNodeKey}
    //   )
    // )
    //
    // We store under the editor key because a top level node (i.e. a decorator)
    // may contain multiple nested editors and it's easier for the plugin in each
    // editor to only know about it's own nodes
    const editorTkNodeMapRef = React.useRef(new Map());

    // node map used in top-level editor to display indicators
    const [tkNodeMap, setTkNodeMap] = React.useState({});
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

            const newTkNodeMap = {};
            let newTkCount = 0;

            editorTkNodeMap.forEach((nodeMap) => {
                nodeMap.forEach(({topLevelNodeKey}, tkNodeKey) => {
                    newTkCount = newTkCount + 1;

                    if (newTkNodeMap[topLevelNodeKey] === undefined) {
                        newTkNodeMap[topLevelNodeKey] = [tkNodeKey];
                    } else {
                        newTkNodeMap[topLevelNodeKey].push(tkNodeKey);
                    }
                });
            });

            setTkNodeMap(newTkNodeMap);
            setTkCount(newTkCount);
        };

        return throttle(updateFn, 5, {trailing: true});
    }, []);

    const addEditorTkNode = React.useCallback((editorKey, topLevelNodeKey, tkNodeKey) => {
        const editorTkNodeMap = editorTkNodeMapRef.current;

        if (!editorTkNodeMap.has(editorKey)) {
            editorTkNodeMap.set(editorKey, new Map());
        }

        editorTkNodeMap.get(editorKey).set(tkNodeKey, {topLevelNodeKey});

        updateTkNodeMap();
    }, [updateTkNodeMap]);

    const removeEditorTkNode = React.useCallback((editorKey, tkNodeKey) => {
        const editorTkNodeMap = editorTkNodeMapRef.current;

        editorTkNodeMap.get(editorKey)?.delete(tkNodeKey);

        if (editorTkNodeMap.get(editorKey)?.size === 0) {
            editorTkNodeMap.delete(editorKey);
        }

        updateTkNodeMap();
    }, [updateTkNodeMap]);

    const removeEditor = React.useCallback((editorKey) => {
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
