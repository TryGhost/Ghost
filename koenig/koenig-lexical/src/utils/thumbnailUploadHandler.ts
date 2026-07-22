import {$getNodeByKey} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';

export const thumbnailUploadHandler = async (files, nodeKey, editor, upload) => {
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
