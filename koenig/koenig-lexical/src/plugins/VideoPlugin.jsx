import React from 'react';
import {
    $getSelection,
    COMMAND_PRIORITY_HIGH,
    $isRangeSelection,
    $isNodeSelection
} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {$createVideoNode, VideoNode, INSERT_VIDEO_COMMAND} from '../nodes/VideoNode';
import {INSERT_MEDIA_COMMAND} from './DragDropPastePlugin';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';

export const VideoPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([VideoNode])){
            console.error('VideoPlugin: VideoNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_VIDEO_COMMAND,
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
                        const videoNode = $createVideoNode(dataset);
                        $insertAndSelectNode({selectedNode: focusNode, newNode: videoNode});
                    }

                    return true;
                },
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                INSERT_MEDIA_COMMAND,
                async (dataset) => {
                    if (dataset.type === 'video') {
                        editor.dispatchCommand(INSERT_VIDEO_COMMAND, {initialFile: dataset.file});
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    }, [editor]);

    return null;
};

export default VideoPlugin;
