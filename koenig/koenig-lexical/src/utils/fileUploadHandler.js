import {$getNodeByKey} from 'lexical';

export const stripFileExtension = (fileName) => {
    const fileExtension = fileName.split('.').pop();
    const fileNameWithoutExtension = fileName.replace(`.${fileExtension}`, '');
    return fileNameWithoutExtension;
};

export const fileUploadHandler = async (files, nodeKey, editor, upload) => {
    if (!files) {
        return;
    }
    const result = await upload(files);
    const meta = files;
    const fileName = meta?.[0].name;
    const fileSize = meta?.[0].size;
    const src = result?.[0].url;

    let dataset = {
        fileName: fileName,
        fileSize: fileSize,
        src: src
    };
    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        node.setTitle(stripFileExtension(dataset.fileName)); // initially sets the title to the file name
        node.setFileName(dataset.fileName);
        node.setFileSize(dataset.fileSize);
        node.setSrc(dataset.src);
    });

    return;
};
