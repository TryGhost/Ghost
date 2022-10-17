import React from 'react';
import {
    $getSelection,
    DRAGOVER_COMMAND,
    DRAGSTART_COMMAND,
    DROP_COMMAND,
    COMMAND_PRIORITY_HIGH,
    $isRangeSelection,
    LexicalEditor,
    $createNodeSelection,
    $setSelection,
    $isParagraphNode
} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {$createImageNode, ImageNode, INSERT_IMAGE_COMMAND} from '../nodes/ImageNode';

export const ImagePlugin = () => {
    const [editor] = useLexicalComposerContext();
    const {imageUploader} = React.useContext(KoenigComposerContext);

    React.useEffect(() => {
        if (!editor.hasNodes([ImageNode])){
            console.error('ImagePlugin: ImageNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_IMAGE_COMMAND,
                (dataset) => {
                    const selection = $getSelection();

                    if (!$isRangeSelection(selection)) {
                        return false;
                    }

                    const focusNode = selection.focus.getNode();

                    if (focusNode !== null) {
                        const imageNode = $createImageNode(dataset);

                        // insert a paragraph if this will be the last card and
                        // we're not already on a blank paragraph so we always
                        // have a trailing paragraph in the doc
                        const selectedNode = selection.focus.getNode();
                        const selectedIsBlankParagraph = $isParagraphNode(selectedNode) && selectedNode.getTextContent() === '';
                        const nextNode = selectedNode.getTopLevelElementOrThrow().getNextSibling();
                        if (!selectedIsBlankParagraph && !nextNode) {
                            selection.insertParagraph();
                        }

                        selection.focus
                            .getNode()
                            .getTopLevelElementOrThrow()
                            .insertBefore(imageNode);

                        // move the focus away from the paragraph to the inserted
                        // decorator node
                        const nodeSelection = $createNodeSelection();
                        nodeSelection.add(imageNode.getKey());
                        $setSelection(nodeSelection);

                        // TODO: trigger file selector?
                    }

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                DRAGSTART_COMMAND,
                (event) => {
                    return onDragStart(event);
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                DRAGOVER_COMMAND,
                (event) => {
                    return onDragOver(event);
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                DROP_COMMAND,
                (event) => {
                    return onDragDrop(event, editor, imageUploader);
                },
                COMMAND_PRIORITY_HIGH
            ),
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
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, files);
    }
};

export default ImagePlugin;
