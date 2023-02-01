import {$getNodeByKey} from 'lexical';

export const thumbnailUploadHandler = async (files, nodeKey, editor, upload) => {
    if (!files) {
        return;
    }
    const fileSrc = await upload(files);
    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        node.setThumbnailSrc(fileSrc[0]);
    });
    return;
};