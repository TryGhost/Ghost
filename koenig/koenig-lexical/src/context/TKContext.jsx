import React from 'react';

const Context = React.createContext({});

export const TKContext = ({children}) => {
    // {
    //   editorKey: {
    //     topLevelNodeKey: tkNodeKey, // key for containing node in primary editor
    //     tkNodes: [tkNodeKey, tkNodeKey, ...]
    //   },
    // }
    //
    // We store under the editor key because a top level node (i.e. a decorator)
    // may contain multiple nested editors and it's easier for the plugin in each
    // editor to only know about it's own nodes
    const [editorTkNodeMap, setEditorTkNodeMap] = React.useState({});

    const setEditorTkNodes = React.useCallback((editorKey, nodeMap) => {
        if (nodeMap === undefined) {
            const newEditorTkNodeMap = {...editorTkNodeMap};
            delete newEditorTkNodeMap[editorKey];
            setEditorTkNodeMap(newEditorTkNodeMap);
        } else {
            setEditorTkNodeMap({...editorTkNodeMap, [editorKey]: nodeMap});
        }
    }, [editorTkNodeMap]);

    const contextValue = React.useMemo(() => {
        // derive a top-level tk node map to use for rendering indicators
        const tkNodeMap = {};
        let tkCount = 0;

        Object.entries(editorTkNodeMap).forEach(([editorKey, nodeMap]) => {
            nodeMap.forEach(({topLevelNodeKey, tkNodeKeys}) => {
                tkCount = tkCount + tkNodeKeys.length;

                if (tkNodeMap[topLevelNodeKey] === undefined) {
                    tkNodeMap[topLevelNodeKey] = [...tkNodeKeys];
                } else {
                    tkNodeMap[topLevelNodeKey].push(...tkNodeKeys);
                }
            });
        });

        return {
            tkNodeMap,
            tkCount,
            editorTkNodeMap,
            setEditorTkNodes
        };
    }, [
        editorTkNodeMap,
        setEditorTkNodes
    ]);

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useTKContext = () => React.useContext(Context);
