import React from 'react';
import {$createProductNode, INSERT_PRODUCT_COMMAND, ProductNode} from '../nodes/ProductNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {ProductNodeData} from '../nodes/ProductNode';

export const ProductPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([ProductNode])){
            console.error('ProductPlugin: ProductNode not registered');
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_PRODUCT_COMMAND,
                (dataset: ProductNodeData) => {
                    const cardNode = $createProductNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    return null;
};

export default ProductPlugin;
