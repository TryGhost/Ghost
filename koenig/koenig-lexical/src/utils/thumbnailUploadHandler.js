import {$getNodeByKey} from 'lexical';

export const thumbnailUploadHandler = async (files, nodeKey, editor, fileUploader) => {
    if (!files) {
        return;
    }
    const fileSrc = await fileUploader.fileUploader(files);
    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        node.setThumbnailSrc(fileSrc.src);
    });
    return;
};