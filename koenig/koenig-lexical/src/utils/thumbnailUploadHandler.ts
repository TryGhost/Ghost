import {$getNodeByKey} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import type {LexicalEditor} from 'lexical';

export const thumbnailUploadHandler = async (files: File[], nodeKey: string, editor: LexicalEditor, upload: (files: File[], options?: {formData: {url: string}}) => Promise<{url: string}[]>) => {
    if (!files) {
        return;
    }

    let mediaSrc = '';

    editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isKoenigCard(node) && typeof node.src === 'string') {
            mediaSrc = node.src;
        }
    });

    const uploadResult = await upload(files, {formData: {url: mediaSrc}});

    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isKoenigCard(node)) {
            node.thumbnailSrc = uploadResult[0].url;
        }
    });

    return;
};
