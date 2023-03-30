import KoenigComposerContext from '../../context/KoenigComposerContext.jsx';
import React from 'react';
import UnsplashModal from './UnsplashModal.jsx';
import {$createNodeSelection, $getNodeByKey, $setSelection} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const UnsplashPlugin = ({nodeKey, isModalOpen = true}) => {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [editor] = useLexicalComposerContext();
    const [isOpen, setIsOpen] = React.useState(isModalOpen);

    const onClose = () => {
        // remove the image node from the editor
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
            node.setSrc(image.src);
            node.setImgHeight(image.height);
            node.setImgWidth(image.width);
            node.setCaption(image.caption);
            node.setAltText(image.alt);
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
