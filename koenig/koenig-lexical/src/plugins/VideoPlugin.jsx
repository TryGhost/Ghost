import React from 'react';
import {$createVideoNode, INSERT_VIDEO_COMMAND, VideoNode} from '../nodes/VideoNode';
import {
    $getSelection,
    $isNodeSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_HIGH
} from 'lexical';
import {$insertAndSelectNode} from '../utils/$insertAndSelectNode';
import {INSERT_MEDIA_COMMAND} from './DragDropPastePlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

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
