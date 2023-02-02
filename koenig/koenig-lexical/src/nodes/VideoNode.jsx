import React, {useState} from 'react';
import {$getNodeByKey} from 'lexical';
import {VideoNode as BaseVideoNode, INSERT_VIDEO_COMMAND} from '@tryghost/kg-default-nodes';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {ReactComponent as VideoCardIcon} from '../assets/icons/kg-card-type-video.svg';
import {VideoCard} from '../components/ui/cards/VideoCard';
import CardContext from '../context/CardContext';
import {openFileSelection} from '../utils/openFileSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import extractVideoMetadata from '../utils/extractVideoMetadata';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_VIDEO_COMMAND} from '@tryghost/kg-default-nodes';

function VideoNodeComponent({
    nodeKey,
    thumbnailSrc,
    customThumbnail,
    caption,
    totalDuration,
    cardWidth,
    triggerFileDialog,
    isLoopChecked
}) {
    const [editor] = useLexicalComposerContext();
    const {fileUploader} = React.useContext(KoenigComposerContext);
    const cardContext = React.useContext(CardContext);
    const videoFileInputRef = React.useRef();
    const [previewThumbnail, setPreviewThumbnail] = useState('');
    const {
        upload: uploadVideo,
        isLoading: isVideoLoading,
        progress: videoUploadProgress,
        errors: videoUploadErrors
    } = fileUploader.useFileUpload();

    const {upload: uploadThumbnail, errors: thumbnailErrors} = fileUploader.useFileUpload();

    const {
        upload: uploadCustomThumbnail,
        isLoading: isCustomThumbnailLoading,
        progress: customThumbnailUploadProgress,
        errors: customThumbnailUploadErrors
    } = fileUploader.useFileUpload();

    const onVideoFileChange = async (e) => {
        const video = e.target.files[0];
        if (!video) {
            return;
        }
        const {thumbnailBlob, duration, width, height} = await extractVideoMetadata(video);
        setPreviewThumbnail(URL.createObjectURL(thumbnailBlob));

        const videoUploadResult = await uploadVideo([video]);
        const videoUrl = videoUploadResult[0];

        if (videoUrl) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setSrc(videoUrl);
                node.setDuration(duration);
                node.setVideoWidth(width);
                node.setVideoHeight(height);
            });
        }

        const imageUploadResult = await uploadThumbnail([thumbnailBlob]);
        const imageUrl = imageUploadResult[0];

        if (imageUrl) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setThumbnailSrc(imageUrl);
            });
        }

        setPreviewThumbnail('');
    };

    const onCaptionChange = (newCaption) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCaption(newCaption);
        });
    };

    const onCustomThumbnailChange = async (e) => {
        const files = e.target.files;
        const urls = await uploadCustomThumbnail(files);
        const imageUrl = urls[0];

        if (imageUrl) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setCustomThumbnailSrc(imageUrl);
            });
        }
    };

    const onRemoveCustomThumbnail = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCustomThumbnailSrc('');
        });
    };

    const onChangeLoop = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setLoop(event.target.checked);
        });
    };

    const onCardWidthChange = (width) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCardWidth(width);
            cardContext.setCardWidth(width);
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
            openFileSelection({fileInputRef: videoFileInputRef});

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
        <VideoCard
            thumbnail={previewThumbnail || thumbnailSrc}
            customThumbnail={customThumbnail}
            onCustomThumbnailChange={onCustomThumbnailChange}
            onRemoveCustomThumbnail={onRemoveCustomThumbnail}
            customThumbnailUploadProgress={customThumbnailUploadProgress}
            isCustomThumbnailLoading={isCustomThumbnailLoading}
            fileInputRef={videoFileInputRef}
            onVideoFileChange={onVideoFileChange}
            caption={caption}
            onCaptionChange={onCaptionChange}
            isLoopChecked={isLoopChecked}
            onChangeLoop={onChangeLoop}
            totalDuration={totalDuration}
            videoUploadProgress={videoUploadProgress}
            isVideoLoading={isVideoLoading}
            isSelected={cardContext.isSelected}
            isEditing={cardContext.isEditing}
            cardWidth={cardWidth}
            onCardWidthChange={onCardWidthChange}
            thumbnailErrors={thumbnailErrors}
            videoUploadErrors={videoUploadErrors}
            customThumbnailUploadErrors={customThumbnailUploadErrors}
        />
    );
}

export class VideoNode extends BaseVideoNode {
    // transient properties used to control node behaviour
    __triggerFileDialog = false;

    static kgMenu = [{
        label: 'Video',
        desc: 'Upload and play a video file',
        Icon: VideoCardIcon,
        insertCommand: INSERT_VIDEO_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['video']
    }];

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog} = dataset;

        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = !dataset.src && triggerFileDialog;
    }

    setTriggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        return writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
                <VideoNodeComponent
                    nodeKey={this.getKey()}
                    thumbnailSrc={this.getThumbnailSrc()}
                    customThumbnail={this.getCustomThumbnailSrc()}
                    totalDuration={this.getFormattedDuration()}
                    caption={this.getCaption()}
                    cardWidth={this.getCardWidth()}
                    isLoopChecked={this.getLoop()}
                    triggerFileDialog={this.__triggerFileDialog}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createVideoNode = (dataset) => {
    return new VideoNode(dataset);
};

export function $isVideoNode(node) {
    return node instanceof VideoNode;
}
