import {$getNodeByKey} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import type {FileUploadResult} from '../context/KoenigComposerContext';
import type {LexicalEditor} from 'lexical';

export const thumbnailUploadHandler = async (files: File[], nodeKey: string, editor: LexicalEditor, upload: FileUploadResult['upload']) => {
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
    const thumbnailSrc = uploadResult?.[0]?.url;

    if (!thumbnailSrc) {
        return;
    }

    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isKoenigCard(node)) {
            node.thumbnailSrc = thumbnailSrc;
        }
    });

    return;
};
