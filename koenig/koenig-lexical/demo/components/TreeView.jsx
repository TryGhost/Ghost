import {TreeView} from '@lexical/react/LexicalTreeView';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const TreeViewPlugin = () => {
    const [editor] = useLexicalComposerContext();

    return (
        <TreeView
            viewClassName="h-full w-full m-[1rem] p-[1rem] pb-16 overflow-auto text-sm text-grey-300 font-mono selection:bg-grey-800"
            timeTravelPanelClassName="absolute bottom-1 flex w-[400px]"
            timeTravelButtonClassName="text-green pb-4 cursor-pointer font-sans text-md font-medium absolute bottom-0"
            timeTravelPanelSliderClassName="m-3 bg-green flex-grow"
            timeTravelPanelButtonClassName="text-green font-sans text-md font-medium"
            editor={editor}
        />
    );
};

export default TreeViewPlugin;
