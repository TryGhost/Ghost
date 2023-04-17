import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React, {useState} from 'react';
import extractVideoMetadata from '../utils/extractVideoMetadata';
import useDragAndDrop from '../hooks/useDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {VideoCard} from '../components/ui/cards/VideoCard';
import {openFileSelection} from '../utils/openFileSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function VideoNodeComponent({
    nodeKey,
    thumbnail,
    customThumbnail,
    captionEditor,
    captionEditorInitialState,
    totalDuration,
    cardWidth,
    triggerFileDialog,
    isLoopChecked,
    initialFile
}) {
    const [editor] = useLexicalComposerContext();
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const cardContext = React.useContext(CardContext);
    const videoFileInputRef = React.useRef();
    const [previewThumbnail, setPreviewThumbnail] = useState('');
    const videoUploader = fileUploader.useFileUpload('video');
    const thumbnailUploader = fileUploader.useFileUpload('mediaThumbnail');
    const customThumbnailUploader = fileUploader.useFileUpload('image');

    const videoDragHandler = useDragAndDrop({handleDrop: handleVideoDrop});
    const thumbnailDragHandler = useDragAndDrop({handleDrop: handleThumbnailDrop});
    const [metadataExtractionErrors, setMetadataExtractionErrors] = useState([]);
    const [showSnippetToolbar, setShowSnippetToolbar] = useState(false);

    const videoMimeTypes = fileUploader.fileTypes.video?.mimeTypes || ['video/*'];

    React.useEffect(() => {
        const uploadInitialFiles = async (file) => {
            if (file && !videoUploader.isLoading) {
                await handleVideoUpload([file]);
            }
        };
        uploadInitialFiles(initialFile);

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleVideoUpload = async (files) => {
        const file = files[0];
        if (!file) {
            return;
        }
        let thumbnailBlob, duration, width, height;
        try {
            ({thumbnailBlob, duration, width, height} = await extractVideoMetadata(file));
        } catch (error) {
            setMetadataExtractionErrors([{
                name: file.name,
                message: `The file type you uploaded is not supported. Please use .${videoMimeTypes.join(', .').toUpperCase()}`
            }]);
        }

        setPreviewThumbnail(URL.createObjectURL(thumbnailBlob));

        const videoUploadResult = await videoUploader.upload([file]);
        const videoUrl = videoUploadResult?.[0]?.url;

        if (!videoUrl) {
            setPreviewThumbnail('');
            return;
        }

        if (videoUrl) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setSrc(videoUrl);
                node.setDuration(duration);
                node.setVideoWidth(width);
                node.setVideoHeight(height);
            });
        }

        const thumbnailFile = new File([thumbnailBlob], `${file.name}.jpg`, {type: 'image/jpeg'});
        const imageUploadResult = await thumbnailUploader.upload([thumbnailFile], {formData: {url: videoUrl}});
        const imageUrl = imageUploadResult?.[0]?.url;

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

    const handleCustomThumbnailChange = async (files) => {
        const customThumbnailUploadResult = await customThumbnailUploader.upload(files);
        const imageUrl = customThumbnailUploadResult?.[0]?.url;

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

    const onLoopChange = (event) => {
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
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                cardWidth={cardWidth}
                customThumbnail={customThumbnail}
                customThumbnailUploader={customThumbnailUploader}
                fileInputRef={videoFileInputRef}
                isEditing={cardContext.isEditing}
                isLoopChecked={isLoopChecked}
                isSelected={cardContext.isSelected}
                thumbnail={previewThumbnail || thumbnail}
                thumbnailDragHandler={thumbnailDragHandler}
                thumbnailMimeTypes={fileUploader.fileTypes.image.mimeTypes}
                totalDuration={totalDuration}
                videoDragHandler={videoDragHandler}
                videoMimeTypes={videoMimeTypes}
                videoUploader={videoUploader}
                videoUploadErrors={[...thumbnailUploader.errors, ...metadataExtractionErrors, ...videoUploader.errors]}
                onCardWidthChange={onCardWidthChange}
                onCustomThumbnailChange={onCustomThumbnailChange}
                onLoopChange={onLoopChange}
                onRemoveCustomThumbnail={onRemoveCustomThumbnail}
                onVideoFileChange={onVideoFileChange}
            />
            <ActionToolbar
                data-kg-card-toolbar="video"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="video"
                isVisible={isCardPopulated && cardContext.isSelected && !cardContext.isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-video-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
