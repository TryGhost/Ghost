import prettifyFileName from './prettifyFileName';
import {$getNodeByKey} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import {getAudioMetadata} from './getAudioMetadata';
import type {LexicalEditor} from 'lexical';

export const audioUploadHandler = async (files: File[], nodeKey: string, editor: LexicalEditor, upload: (files: File[]) => Promise<{url: string}[] | null>) => {
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
    const mimeType = files[0].type;
    const {duration} = await getAudioMetadata(objectURL);

    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isKoenigCard(node)) {
            node.duration = duration;
            node.src = fileSrc;
            node.mimeType = mimeType;
            node.title = title;
        }
    });

    return;
};
