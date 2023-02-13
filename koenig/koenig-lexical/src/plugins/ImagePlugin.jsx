import React from 'react';
import {
    $getSelection,
    COMMAND_PRIORITY_HIGH,
    $isRangeSelection,
    $createNodeSelection,
    $setSelection,
    $isParagraphNode,
    $isNodeSelection
} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {$createImageNode, ImageNode, INSERT_IMAGE_COMMAND} from '../nodes/ImageNode';
import {imageUploadHandler} from '../utils/imageUploadHandler';
import UnsplashPlugin from '../components/ui/UnsplashPlugin';
import {INSERT_MEDIA_COMMAND} from './DragDropPastePlugin';

export const ImagePlugin = () => {
    const [editor] = useLexicalComposerContext();
    const {fileUploader} = React.useContext(KoenigComposerContext);
    const [selector, setSelector] = React.useState(null);
    const [selectedKey, setSelectedKey] = React.useState(null);
    const [showModal, setShowModal] = React.useState(false);

    const imageUploader = fileUploader.useFileUpload('image');

    const handleImageUpload = React.useCallback(async (files, imageNodeKey) => {
        if (files?.length > 0) {
            return await imageUploadHandler(files, imageNodeKey, editor, imageUploader.upload);
        }
    }, [imageUploader.upload, editor]);

    const setNodeSelection = ({selection, selectedNode, imageNode, dataset}) => {
        const selectedIsParagraph = $isParagraphNode(selectedNode);
        const selectedIsEmpty = selectedNode.getTextContent() === '';
        if (dataset.initialFile) {
            // Audio file was dragged/dropped directly into the editor
            // so we insert the AudioNode after the selected node
            selectedNode
                .getTopLevelElementOrThrow()
                .insertAfter(imageNode);
            if (selectedIsParagraph && selectedIsEmpty) {
                selectedNode.remove();
            }
        } else {
            // Audio node was added without an initial file (via Slash or Plus menu)
            // so we insert the AudioNode before the selected node
            selectedNode
                .getTopLevelElementOrThrow()
                .insertBefore(imageNode);
        }
        const nodeSelection = $createNodeSelection();
        nodeSelection.add(imageNode.getKey());
        $setSelection(nodeSelection);
    };

    React.useEffect(() => {
        if (!editor.hasNodes([ImageNode])){
            console.error('ImagePlugin: ImageNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_IMAGE_COMMAND,
                async (dataset) => {
                    const selection = $getSelection();
                    
                    let focusNode;
                    if ($isRangeSelection(selection)) {
                        focusNode = selection.focus.getNode();
                    } else if ($isNodeSelection(selection)) {
                        focusNode = selection.getNodes()[0];
                    } else {
                        return false;
                    }

                    if (focusNode !== null) {
                        const imageNode = $createImageNode(dataset);

                        // fires the unsplash selector
                        if (dataset?.triggerFileSelector === 'unsplash') {
                            setSelectedKey(imageNode.getKey());
                            setShowModal(true);
                            setSelector('unsplash');
                        }

                        setNodeSelection({selection, selectedNode: focusNode, imageNode, dataset});
                    }

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                INSERT_MEDIA_COMMAND,
                async (dataset) => {
                    if (dataset.type === 'image') {
                        editor.dispatchCommand(INSERT_IMAGE_COMMAND, {initialFile: dataset.file});
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    }, [editor, fileUploader, handleImageUpload]);

    if (showModal && selector) {
        return (<UnsplashPlugin
            nodeKey={selectedKey}
            handleModalClose={setShowModal}
        />);
    }

    return null;
};

export default ImagePlugin;
