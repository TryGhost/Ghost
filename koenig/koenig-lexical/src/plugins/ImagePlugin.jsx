import React from 'react';
import {
    $getSelection,
    COMMAND_PRIORITY_HIGH,
    $isRangeSelection,
    $isNodeSelection
} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {$createImageNode, ImageNode, INSERT_IMAGE_COMMAND} from '../nodes/ImageNode';
import {imageUploadHandler} from '../utils/imageUploadHandler';
import UnsplashPlugin from '../components/ui/UnsplashPlugin';
import {INSERT_MEDIA_COMMAND} from './DragDropPastePlugin';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';

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

                        // opens the unsplash selector
                        if (dataset?.triggerFileSelector === 'unsplash') {
                            setSelectedKey(imageNode.getKey());
                            setShowModal(true);
                            setSelector('unsplash');
                        }

                        $insertAndSelectNode({selectedNode: focusNode, newNode: imageNode});
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
