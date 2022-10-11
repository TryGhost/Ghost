import React from 'react';
import {$createImageNode, ImageNode} from '../nodes/ImageNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
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
import {mergeRegister} from '@lexical/utils';

export const INSERT_IMAGE_CMD = createCommand();

export const ImagePlugin = () => {
    const [editor] = useLexicalComposerContext();

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
                return onDragDrop(event, editor);
            }, COMMAND_PRIORITY_HIGH),
        );
    }, [editor]);

    return null;
};
  
const onDragStart = (event) => {
    return true;
};

const onDragOver = (event) => {
    return true;
};

const onDragDrop = async (event, editor = LexicalEditor) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        const reader = new FileReader();
        const file = event.dataTransfer.files[0];
        reader.readAsDataURL(file);
        reader.onload = () => {
            const dataset = {
                src: reader.result
            };
            editor.dispatchCommand(INSERT_IMAGE_CMD, dataset);
            return dataset;
        };
    }
};

export default ImagePlugin;
