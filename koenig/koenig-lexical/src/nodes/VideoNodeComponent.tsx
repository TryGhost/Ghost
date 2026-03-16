import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React, {useState} from 'react';
import extractVideoMetadata from '../utils/extractVideoMetadata';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {VideoCard} from '../components/ui/cards/VideoCard';
import {getImageDimensions} from '../utils/getImageDimensions';
import {isCardWidth, type CardWidth} from '@tryghost/kg-default-nodes';
import {openFileSelection} from '../utils/openFileSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {LexicalEditor} from 'lexical';
import type {VideoNode} from './VideoNode';

function $getVideoNodeByKey(nodeKey: string): VideoNode | null {
    return $getNodeByKey(nodeKey) as VideoNode | null;
}

interface VideoNodeComponentProps {
    nodeKey: string;
    thumbnail: string;
    customThumbnail: string;
    captionEditor: LexicalEditor;
    captionEditorInitialState: string | undefined;
    totalDuration: string;
    cardWidth: CardWidth;
    triggerFileDialog: boolean;
    isLoopChecked: boolean;
    initialFile: File | null;
}

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
}: VideoNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const cardContext = React.useContext(CardContext);
    const videoFileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [previewThumbnail, setPreviewThumbnail] = useState('');
    const videoUploader = fileUploader.useFileUpload('video');
    const thumbnailUploader = fileUploader.useFileUpload('mediaThumbnail');
    const customThumbnailUploader = fileUploader.useFileUpload('image');

    const videoDragHandler = useFileDragAndDrop({handleDrop: handleVideoDrop});
    const thumbnailDragHandler = useFileDragAndDrop({handleDrop: handleThumbnailDrop});
    const [metadataExtractionErrors, setMetadataExtractionErrors] = useState<{name: string; message: string}[]>([]);
    const [showSnippetToolbar, setShowSnippetToolbar] = useState(false);

    const videoMimeTypes = fileUploader.fileTypes.video?.mimeTypes || ['video/*'];

    React.useEffect(() => {
        const uploadInitialFiles = async (file: File | null) => {
            if (file && !videoUploader.isLoading) {
                await handleVideoUpload([file]);
            }
        };
        uploadInitialFiles(initialFile);

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleVideoUpload = async (files: File[] | FileList) => {
        const file = files[0];
        if (!file) {
            return;
        }
        let thumbnailBlob: Blob | null | undefined;
        let duration: number | undefined;
        let width: number | undefined;
        let height: number | undefined;
        let mimeType: string | undefined;
        try {
            ({thumbnailBlob, duration, width, height, mimeType} = await extractVideoMetadata(file));
        } catch {
            setMetadataExtractionErrors([{
                name: file.name,
                message: `The file type you uploaded is not supported. Please use .${videoMimeTypes.join(', .').toUpperCase()}`
            }]);
            return;
        }

        if (thumbnailBlob) {
            setPreviewThumbnail(URL.createObjectURL(thumbnailBlob));
        }

        const videoUploadResult = await videoUploader.upload([file]);
        const videoUrl = videoUploadResult?.[0]?.url;

        if (!videoUrl) {
            setPreviewThumbnail('');
            return;
        }

        if (videoUrl) {
            editor.update(() => {
                const node = $getVideoNodeByKey(nodeKey);
                if (!node) {return;}
                node.src = videoUrl;
                node.duration = duration ?? 0;
                node.fileName = file.name;
                node.width = width ?? null;
                node.height = height ?? null;
                node.mimeType = mimeType ?? '';
                if (!node.customThumbnailSrc) {
                    node.thumbnailWidth = width ?? null;
                    node.thumbnailHeight = height ?? null;
                }
            });
        }

        const thumbnailFile = thumbnailBlob ? new File([thumbnailBlob], `${file.name}.jpg`, {type: 'image/jpeg'}) : null;
        if (!thumbnailFile) {return;}
        const imageUploadResult = await thumbnailUploader.upload([thumbnailFile], {formData: {url: videoUrl}});
        const imageUrl = imageUploadResult?.[0]?.url;

        if (imageUrl) {
            editor.update(() => {
                const node = $getVideoNodeByKey(nodeKey);
                if (!node) {return;}
                node.thumbnailSrc = imageUrl;
            });
        }

        setPreviewThumbnail('');
    };

    const onVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !files[0]) {
            return;
        }
        await handleVideoUpload(files);
    };

    const handleCustomThumbnailChange = async (files: File[] | FileList) => {
        const customThumbnailUploadResult = await customThumbnailUploader.upload(Array.from(files));
        const imageUrl = customThumbnailUploadResult?.[0]?.url;
        const {width, height} = await getImageDimensions(imageUrl!);

        if (imageUrl) {
            editor.update(() => {
                const node = $getVideoNodeByKey(nodeKey);
                if (!node) {return;}
                node.customThumbnailSrc = imageUrl;
                node.thumbnailWidth = width;
                node.thumbnailHeight = height;
            });
        }
    };

    const onCustomThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) {return;}
        await handleCustomThumbnailChange(e.target.files);
    };

    async function handleVideoDrop(files: File[]) {
        await handleVideoUpload(files);
    }

    async function handleThumbnailDrop(files: File[]) {
        await handleCustomThumbnailChange(files);
    }

    const onRemoveCustomThumbnail = () => {
        editor.update(() => {
            const node = $getVideoNodeByKey(nodeKey);
            if (!node) {return;}
            node.customThumbnailSrc = '';
            node.thumbnailHeight = node.height;
            node.thumbnailWidth = node.width;
        });
    };

    const onLoopChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getVideoNodeByKey(nodeKey);
            if (!node) {return;}
            node.loop = event.target.checked;
        });
    };

    const onCardWidthChange = (width: unknown) => {
        if (!isCardWidth(width)) {
            return;
        }

        editor.update(() => {
            const node = $getVideoNodeByKey(nodeKey);
            if (!node) {return;}
            node.cardWidth = width;
            cardContext.setCardWidth(width);
        });
    };

    const handleToolbarEdit = (event: React.MouseEvent) => {
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
                const node = $getVideoNodeByKey(nodeKey);
                if (!node) {return;}
                node.triggerFileDialog = false;
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
                isVisible={!!isCardPopulated && cardContext.isSelected && !cardContext.isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-video-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Save as snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
