import React from 'react';
import {$getNodeByKey} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {ImageCard} from '../components/ui/cards/ImageCard';

export function ImageNodeComponent({nodeKey, src, altText, caption}) {
    const [editor] = useLexicalComposerContext();
    const {isSelected} = React.useContext(CardContext);
    const {imageUploader} = React.useContext(KoenigComposerContext);

    const onFileChange = async (e) => {
        const fls = e.target.files;
        const files = await imageUploader.imageUploader(fls); // idea here is to have something like imageUploader.uploadProgressPercentage to pass to the progress bar.

        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setSrc(files.src);
        });
    };

    const setCaption = (newCaption) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCaption(newCaption);
        });
    };

    const setAltText = (newAltText) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setAltText(newAltText);
        });
    };

    return (
        <ImageCard
            isSelected={isSelected}
            onFileChange={onFileChange}
            src={src}
            altText={altText}
            setAltText={setAltText}
            caption={caption}
            setCaption={setCaption}
        />
    );
}
