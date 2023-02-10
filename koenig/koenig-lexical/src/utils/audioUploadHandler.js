import {$getNodeByKey} from 'lexical';
import {getAudioMetadata} from './getAudioMetadata';
import prettifyFileName from './prettifyFileName';

export const audioUploadHandler = async (files, nodeKey, editor, upload) => {
    if (!files) {
        return;
    }
    let url = URL.createObjectURL(files[0]);
    let filename = files[0].name;
    let title = prettifyFileName(filename);

    const filesSrc = await upload(files);
    const fileSrc = filesSrc && filesSrc[0];

    if (!fileSrc) {
        return;
    }
    const {duration, mimeType} = await getAudioMetadata(url);
    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        node.setDuration(duration);
        node.setSrc(fileSrc[0]);
        node.setMimeType(mimeType);
        node.setTitle(title);
    });
    return;
};
