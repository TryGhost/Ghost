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

    // upload() resolves to null when the upload fails (e.g. a host limit or
    // validation error). Bail out so we don't throw trying to read the result,
    // and so the card falls back to its empty state where the error is shown.
    if (!result || !result[0]) {
        return;
    }

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
        node.fileTitle = stripFileExtension(dataset.fileName); // initially sets the title to the file name
        node.fileName = dataset.fileName;
        node.fileSize = dataset.fileSize;
        node.src = dataset.src;
    });

    return;
};
