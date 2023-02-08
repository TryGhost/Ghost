import React, {useState} from 'react';
import {$getNodeByKey} from 'lexical';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {VideoCard} from '../components/ui/cards/VideoCard';
import CardContext from '../context/CardContext';
import {openFileSelection} from '../utils/openFileSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import extractVideoMetadata from '../utils/extractVideoMetadata';
import useDragAndDrop from '../hooks/useDragAndDrop';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';

export function VideoNodeComponent({
    nodeKey,
    thumbnail,
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
    const videoUploader = fileUploader.useFileUpload();
    const {upload: uploadThumbnail, errors: thumbnailErrors} = fileUploader.useFileUpload();
    const customThumbnailUploader = fileUploader.useFileUpload();

    const videoDragHandler = useDragAndDrop(handleVideoDrop);
    const thumbnailDragHandler = useDragAndDrop(handleThumbnailDrop);

    const handleVideoUpload = async (files) => {
        const file = files[0];
        if (!file) {
            return;
        }
        const {thumbnailBlob, duration, width, height} = await extractVideoMetadata(file);
        setPreviewThumbnail(URL.createObjectURL(thumbnailBlob));

        const videoUploadResult = await videoUploader.upload([file]);
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

    const onVideoFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        await handleVideoUpload(e.target.files);
    };

    const onCaptionChange = (newCaption) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCaption(newCaption);
        });
    };

    const handleCustomThumbnailChange = async (files) => {
        const urls = await customThumbnailUploader.upload(files);
        const imageUrl = urls[0];

        if (imageUrl) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setCustomThumbnailSrc(imageUrl);
            });
        }
    };

    const onCustomThumbnailChange = async (e) => {
        await handleCustomThumbnailChange(e.target.files);
    };

    async function handleVideoDrop(files) {
        await handleVideoUpload(files);
    }

    async function handleThumbnailDrop(files) {
        await handleCustomThumbnailChange(files);
    }

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

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        cardContext.setEditing(true);
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

    const isCardPopulated = customThumbnail || thumbnail;

    return (
        <>
            <VideoCard
                thumbnail={previewThumbnail || thumbnail}
                customThumbnail={customThumbnail}
                onCustomThumbnailChange={onCustomThumbnailChange}
                onRemoveCustomThumbnail={onRemoveCustomThumbnail}
                fileInputRef={videoFileInputRef}
                onVideoFileChange={onVideoFileChange}
                caption={caption}
                onCaptionChange={onCaptionChange}
                isLoopChecked={isLoopChecked}
                onChangeLoop={onChangeLoop}
                totalDuration={totalDuration}
                videoUploader={videoUploader}
                customThumbnailUploader={customThumbnailUploader}
                isSelected={cardContext.isSelected}
                isEditing={cardContext.isEditing}
                cardWidth={cardWidth}
                onCardWidthChange={onCardWidthChange}
                thumbnailErrors={thumbnailErrors}
                videoDragHandler={videoDragHandler}
                thumbnailDragHandler={thumbnailDragHandler}
            />
            <ActionToolbar
                isVisible={isCardPopulated && cardContext.isSelected && !cardContext.isEditing}
                data-kg-card-toolbar="video"
            >
                <ToolbarMenu>
                    <ToolbarMenuItem label="Edit" icon="edit" isActive={false} onClick={handleToolbarEdit} dataTestId="edit-video-card" />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem label="Snippet" icon="snippet" isActive={false} />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
