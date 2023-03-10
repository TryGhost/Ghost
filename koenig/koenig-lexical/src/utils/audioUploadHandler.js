import prettifyFileName from './prettifyFileName';
import {$getNodeByKey} from 'lexical';
import {getAudioMetadata} from './getAudioMetadata';

export const audioUploadHandler = async (files, nodeKey, editor, upload) => {
    if (!files) {
        return;
    }

    // perform the actual upload
    const result = await upload(files);
    const fileSrc = result?.[0].url;

    if (!fileSrc) {
        return;
    }

    // grab basic metadata from the file directly
    const filename = files[0].name;
    const title = prettifyFileName(filename);

    // read file into an object URL so we can grab extra metadata
    const objectURL = URL.createObjectURL(files[0]);
    const {duration, mimeType} = await getAudioMetadata(objectURL);

    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        node.setDuration(duration);
        node.setSrc(fileSrc);
        node.setMimeType(mimeType);
        node.setTitle(title);
    });

    return;
};
