import React from 'react';
import {$getNodeByKey} from 'lexical';
import {AudioNode as BaseAudioNode, INSERT_AUDIO_COMMAND} from '@tryghost/kg-default-nodes';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {ReactComponent as AudioCardIcon} from '../assets/icons/kg-card-type-audio.svg';
import {AudioCard} from '../components/ui/cards/AudioCard';
import {audioUploadHandler} from '../utils/audioUploadHandler';
import {thumbnailUploadHandler} from '../utils/thumbnailUploadHandler';
import CardContext from '../context/CardContext';
import {openFileSelection} from '../utils/openFileSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_AUDIO_COMMAND} from '@tryghost/kg-default-nodes';

function AudioNodeComponent({nodeKey, src, thumbnailSrc, title, duration, triggerFileDialog}) {
    const [editor] = useLexicalComposerContext();
    const {fileUploader} = React.useContext(KoenigComposerContext);
    const audioFileInputRef = React.useRef();
    const thumbnailFileInputRef = React.useRef();
    const cardContext = React.useContext(CardContext);

    const {progress: audioProgress, isLoading: isUploadingAudio, upload: uploadAudio} = fileUploader.useFileUpload();
    const {progress: thumbnailProgress, isLoading: isUploadingThumbnail, upload: uploadThumbnail} = fileUploader.useFileUpload();

    const onAudioFileChange = async (e) => {
        const fls = e.target.files;
        return await audioUploadHandler(fls, nodeKey, editor, uploadAudio);
    };

    const onThumbnailFileChange = async (e) => {
        const fls = e.target.files;
        return await thumbnailUploadHandler(fls, nodeKey, editor, uploadThumbnail);
    };

    const setTitle = (newTitle) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setTitle(newTitle);
        });
    };

    const removeThumbnail = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setThumbnailSrc('');
        });
    };

    // when card is inserted from the card menu or slash command we want to show the file picker immediately
    // uses a setTimeout to avoid issues with React rendering the component twice in dev mode 🙈
    React.useEffect(() => {
        if (!triggerFileDialog) {
            return;
        }

        const renderTimeout = setTimeout(() => {
            // trigger dialog
            openFileSelection({fileInputRef: audioFileInputRef});

            // clear the property on the node so we don't accidentally trigger anything with a re-render
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setTriggerFileDialog(false);
            });
        });

        return (() => {
            clearTimeout(renderTimeout);
        });
    });

    return (
        <AudioCard
            nodeKey={nodeKey}
            src={src}
            thumbnailSrc={thumbnailSrc}
            title={title}
            isEditing={cardContext.isEditing}
            duration={duration}
            updateTitle={setTitle}
            triggerFileDialog={triggerFileDialog}
            audioProgress={audioProgress}
            isUploadingAudio={isUploadingAudio}
            thumbnailProgress={thumbnailProgress}
            isUploadingThumbnail={isUploadingThumbnail}
            audioFileInputRef={audioFileInputRef}
            thumbnailFileInputRef={thumbnailFileInputRef}
            onAudioFileChange={onAudioFileChange}
            onThumbnailFileChange={onThumbnailFileChange}
            removeThumbnail={removeThumbnail}
        />
    );
}

export class AudioNode extends BaseAudioNode {
    // transient properties used to control node behaviour
    __triggerFileDialog = false;

    static kgMenu = [{
        label: 'Audio',
        desc: 'Upload and play an audio file',
        Icon: AudioCardIcon,
        insertCommand: INSERT_AUDIO_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['audio']
    }];

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog} = dataset;

        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false;
    }

    setTriggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        return writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.__cardWidth}>
                <AudioNodeComponent
                    nodeKey={this.getKey()}
                    src={this.__src}
                    thumbnailSrc={this.__thumbnailSrc}
                    duration={this.__duration}
                    title={this.__title}
                    triggerFileDialog={this.__triggerFileDialog}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createAudioNode = (dataset) => {
    return new AudioNode(dataset);
};

export function $isAudioNode(node) {
    return node instanceof AudioNode;
}
