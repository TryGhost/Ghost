import {$getNodeByKey} from 'lexical';
import {$isKoenigCard} from '@tryghost/kg-default-nodes';
import {getImageDimensions} from './getImageDimensions';
import type {LexicalEditor} from 'lexical';

export const imageUploadHandler = async (files: File[] | FileList, nodeKey: string, editor: LexicalEditor, upload: (files: File[] | FileList) => Promise<{url: string}[] | null>) => {
    if (!files) {
        return;
    }

    const isTargetCard = editor.getEditorState().read(() => {
        return $isKoenigCard($getNodeByKey(nodeKey));
    });
    if (!isTargetCard) {
        return;
    }

    // show preview via an object URL whilst upload is in progress
    const previewUrl = URL.createObjectURL(files[0]);
    if (previewUrl) {
        await editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isKoenigCard(node)) {
                node.previewSrc = previewUrl;
            }
        });
    }

    // use the local object URL to grab metadata
    const {width, height} = await getImageDimensions(previewUrl);

    // perform the actual upload
    const result = await upload(files);
    const imageSrc = result?.[0].url;

    // replace preview URL with real URL and set image metadata
    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isKoenigCard(node)) {
            node.width = width;
            node.height = height;
            node.src = imageSrc;
            node.previewSrc = null;
        }
    });

    return;
};

export const backgroundImageUploadHandler = async (files: File[], upload: (files: File[]) => Promise<{url: string}[] | null>) => {
    if (!files) {
        return;
    }
    const result = await upload(files);
    const imageSrc = result?.[0].url;

    const {width, height} = await getImageDimensions(imageSrc!);

    return {
        imageSrc,
        width,
        height
    };
};
