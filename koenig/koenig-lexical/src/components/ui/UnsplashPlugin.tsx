import KoenigComposerContext from '../../context/KoenigComposerContext.jsx';
import React from 'react';
import UnsplashModal from './file-selectors/UnsplashModal.jsx';
import generateEditorState from '../../utils/generateEditorState';
import {$createNodeSelection, $getNodeByKey, $setSelection} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const UnsplashPlugin = ({nodeKey, isModalOpen = true}) => {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [editor] = useLexicalComposerContext();
    const [isOpen, setIsOpen] = React.useState(isModalOpen);

    const onClose = () => {
        if (nodeKey) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.remove();
            });
        }
    };

    const insertImageToNode = async (image) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.src = image.src;
            node.height = image.height;
            node.width = image.width;
            node.caption = image.caption;
            node.alt = image.alt;
            const editorState = generateEditorState({
                editor: node.__captionEditor,
                initialHtml: `${image.caption}`
            });
            node.__captionEditor.setEditorState(editorState);
            const nodeSelection = $createNodeSelection();
            nodeSelection.add(node.getKey());
            $setSelection(nodeSelection);
        });
        setIsOpen(false);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <UnsplashModal
            unsplashConf={cardConfig.unsplash}
            onClose={onClose}
            onImageInsert={insertImageToNode}
        />
    );
};

export default UnsplashPlugin;
