import {$getNodeByKey} from 'lexical';

export const thumbnailUploadHandler = async (files, nodeKey, editor, upload) => {
    if (!files) {
        return;
    }

    let mediaSrc = '';

    editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey);
        mediaSrc = node.getSrc();
    });

    const uploadResult = await upload(files, {formData: {url: mediaSrc}});

    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        node.setThumbnailSrc(uploadResult[0].url);
    });

    return;
};
