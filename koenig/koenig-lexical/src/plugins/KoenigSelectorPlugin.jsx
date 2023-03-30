import React from 'react';
import TenorPlugin from '../components/ui/TenorPlugin';
import UnsplashPlugin from '../components/ui/UnsplashPlugin';
import {$createImageNode, ImageNode} from '../nodes/ImageNode';
import {$getSelection, COMMAND_PRIORITY_LOW, createCommand} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const OPEN_TENOR_SELECTOR_COMMAND = createCommand('OPEN_TENOR_SELECTOR_COMMAND');
export const INSERT_FROM_TENOR_COMMAND = createCommand('INSERT_FROM_TENOR_COMMAND');
export const OPEN_UNSPLASH_SELECTOR_COMMAND = createCommand('OPEN_UNSPLASH_SELECTOR_COMMAND');

export const KoenigSelectorPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([ImageNode])){
            console.error('ImagePlugin: ImageNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                OPEN_TENOR_SELECTOR_COMMAND,
                async (dataset) => {
                    const cardNode = $createImageNode({...dataset, selector: TenorPlugin, isImageHidden: true});

                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                INSERT_FROM_TENOR_COMMAND,
                async (dataset) => {
                    const imageNode = $createImageNode(dataset);

                    const selection = $getSelection();
                    const selectedNode = selection.getNodes()[0];

                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode: imageNode});
                    selectedNode.remove();

                    return true;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                OPEN_UNSPLASH_SELECTOR_COMMAND,
                async (dataset) => {
                    const cardNode = $createImageNode({...dataset, selector: UnsplashPlugin});
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            ),
        );
    }, [editor]);

    return null;
};

export default KoenigSelectorPlugin;
