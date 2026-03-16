import React from 'react';
import throttle from 'lodash/throttle';

interface TKContextType {
    tkNodeMap: Record<string, string[]>;
    tkCount: number;
    addEditorTkNode: (editorKey: string, topLevelNodeKey: string, tkNodeKey: string) => void;
    removeEditorTkNode: (editorKey: string, tkNodeKey: string) => void;
    removeEditor: (editorKey: string) => void;
}

const noop = () => {};

const Context = React.createContext<TKContextType>({
    tkNodeMap: {},
    tkCount: 0,
    addEditorTkNode: noop,
    removeEditorTkNode: noop,
    removeEditor: noop
});

export const TKContext = ({children}: {children: React.ReactNode}) => {
    const editorTkNodeMapRef = React.useRef(new Map());

    const [tkNodeMap, setTkNodeMap] = React.useState<Record<string, string[]>>({});
    const [tkCount, setTkCount] = React.useState(0);

    const updateTkNodeMap = React.useMemo(() => {
        const updateFn = () => {
            const editorTkNodeMap = editorTkNodeMapRef.current;

            const newTkNodeMap: Record<string, string[]> = {};
            let newTkCount = 0;

            editorTkNodeMap.forEach((nodeMap: Map<string, {topLevelNodeKey: string}>) => {
                nodeMap.forEach(({topLevelNodeKey}: {topLevelNodeKey: string}, tkNodeKey: string) => {
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

    const addEditorTkNode = React.useCallback((editorKey: string, topLevelNodeKey: string, tkNodeKey: string) => {
        const editorTkNodeMap = editorTkNodeMapRef.current;

        if (!editorTkNodeMap.has(editorKey)) {
            editorTkNodeMap.set(editorKey, new Map());
        }

        editorTkNodeMap.get(editorKey).set(tkNodeKey, {topLevelNodeKey});

        updateTkNodeMap();
    }, [updateTkNodeMap]);

    const removeEditorTkNode = React.useCallback((editorKey: string, tkNodeKey: string) => {
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
