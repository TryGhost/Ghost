import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import UnsplashPlugin from '../components/ui/UnsplashPlugin';
import {$createImageNode, INSERT_IMAGE_COMMAND, ImageNode} from '../nodes/ImageNode';
import {COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {INSERT_MEDIA_COMMAND} from './DragDropPastePlugin';
import {imageUploadHandler} from '../utils/imageUploadHandler';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

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
                    const cardNode = $createImageNode(dataset);

                    // TODO: move selector handling to a KoenigSelectorPlugin and attach a command to it,
                    // e.g. editor.dispatchCommand(OPEN_SELECTOR_COMMAND, {selector: 'unsplash', nodeKey: cardNode.getKey()});
                    if (dataset?.triggerFileSelector === 'unsplash') {
                        setSelectedKey(cardNode.getKey());
                        setShowModal(true);
                        setSelector('unsplash');
                    }

                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode});

                    return true;
                },
                COMMAND_PRIORITY_LOW
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
            handleModalClose={setShowModal}
            nodeKey={selectedKey}
        />);
    }

    return null;
};

export default ImagePlugin;
