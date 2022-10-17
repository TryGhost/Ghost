import React from 'react';
import {
    $getSelection,
    DRAGOVER_COMMAND,
    DRAGSTART_COMMAND,
    DROP_COMMAND,
    COMMAND_PRIORITY_HIGH,
    createCommand,
    $isRangeSelection,
    $isRootNode,
    LexicalEditor
} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {$createImageNode, ImageNode} from '../nodes/ImageNode';

export const INSERT_IMAGE_CMD = createCommand();

export const ImagePlugin = () => {
    const [editor] = useLexicalComposerContext();
    const {imageUploader} = React.useContext(KoenigComposerContext);

    React.useEffect(() => {
        if (!editor.hasNodes([ImageNode])){
            console.error('ImagePlugin: ImageNode not registered'); // eslint-disable-line no-console
        }
        return mergeRegister(
            editor.registerCommand(INSERT_IMAGE_CMD, (dataset) => {
                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection) {
                        if ($isRootNode(selection.anchor.getNode())){
                            selection.insertParagraph();
                        }
                        const imgNode = $createImageNode(dataset);
                        selection.insertNodes([imgNode]);
                    }
                });
            }, COMMAND_PRIORITY_HIGH),
            editor.registerCommand(DRAGSTART_COMMAND, (event) => {
                return onDragStart(event);
            }, COMMAND_PRIORITY_HIGH),
            editor.registerCommand(DRAGOVER_COMMAND, (event) => {
                return onDragOver(event);
            }, COMMAND_PRIORITY_HIGH),
            editor.registerCommand(DROP_COMMAND, (event) => {
                return onDragDrop(event, editor, imageUploader);
            }, COMMAND_PRIORITY_HIGH),
        );
    }, [editor, imageUploader]);

    return null;
};

const onDragStart = (event) => {
    return true;
};

const onDragOver = (event) => {
    return true;
};

const onDragDrop = async (event, editor = LexicalEditor, imageUploader) => {
    event.preventDefault();
    const fls = event.dataTransfer.files;
    const files = await imageUploader.imageUploader(fls);
    if (files) {
        editor.dispatchCommand(INSERT_IMAGE_CMD, files);
    }
};

export default ImagePlugin;
