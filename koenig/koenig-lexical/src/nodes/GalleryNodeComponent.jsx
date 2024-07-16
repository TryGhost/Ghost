import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import useGalleryReorder from '../hooks/useGalleryReorder';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {GalleryCard} from '../components/ui/cards/GalleryCard';
import {MAX_IMAGES, recalculateImageRows} from './GalleryNode';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {getImageDimensions} from '../utils/getImageDimensions';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function GalleryNodeComponent({nodeKey, captionEditor, captionEditorInitialState}) {
    const [editor] = useLexicalComposerContext();
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const {isSelected} = React.useContext(CardContext);
    const fileInputRef = React.useRef();
    const [errorMessage, setErrorMessage] = React.useState(null);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [images, setImages] = React.useState(() => {
        const existingImages = editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey);
            return node.images;
        });
        return existingImages;
    });

    const galleryReorder = useGalleryReorder({images, updateImages: reorderImages, isSelected});
    const imageUploader = fileUploader.useFileUpload('image');
    const imageFilesDropper = useFileDragAndDrop({handleDrop: handleImageFilesDrop});

    function reorderImages(newImages) {
        recalculateImageRows(newImages);
        setImages(newImages);
        setNodeImages(newImages);
    }

    function setNodeImages(newImages) {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setImages(newImages);
        });
    }

    const deleteImage = (imageToDelete) => {
        const newImages = images.filter(image => image.fileName !== imageToDelete.fileName);
        recalculateImageRows(newImages);
        setImages(newImages);
        setNodeImages(newImages);
    };

    const handleImageUploads = async (files) => {
        const currentCount = images.length;
        const allowedCount = (MAX_IMAGES - currentCount);

        const strippedFiles = Array.prototype.slice.call(files, 0, allowedCount);
        if (strippedFiles.length < files.length) {
            setErrorMessage('Galleries are limited to 9 images');
        }

        if (strippedFiles.length === 0) {
            return;
        }

        const newImages = [...images];

        // create preview images and capture dimensions
        for (const file of strippedFiles) {
            const previewSrc = URL.createObjectURL(file);
            const {width, height} = await getImageDimensions(previewSrc);

            newImages.push({
                fileName: file.name,
                previewSrc,
                width,
                height
            });
        }

        recalculateImageRows(newImages);

        // show preview images immediately
        setImages(newImages);

        // start uploads
        const uploadResult = await imageUploader.upload(strippedFiles);
        const uploadedImages = [...newImages];

        if (!uploadResult) {
            setErrorMessage('Something went wrong while uploading images. Please refresh the page and try again');
            return;
        }

        uploadResult.forEach((result) => {
            const image = uploadedImages.find(i => i.fileName === result.fileName);

            if (!image) {
                console.error('Uploaded image not found in images array. Filename:', result.fileName); // eslint-disable-line no-console
                return;
            }

            image.src = result.url;
        });

        // update local state (it's not updated from Lexical state aside from initial setup)
        // then update Lexical state which will trigger a save
        setImages(newImages);
        setNodeImages(newImages);
    };

    const onFileChange = async (e) => {
        const files = e.target.files;

        if (!files || !files.length) {
            return;
        }

        return await handleImageUploads(files);
    };

    async function handleImageFilesDrop(files) {
        await handleImageUploads(files);
    }

    function handleToolbarAdd(event) {
        event.preventDefault();
        fileInputRef.current.click();
    }

    const clearErrorMessage = () => {
        setErrorMessage(null);
    };

    const hideToolbar =
        !isSelected ||
        imageFilesDropper.isDraggedOver ||
        galleryReorder.isDraggedOver ||
        images.length <= 0;

    return (
        <>
            <GalleryCard
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                clearErrorMessage={clearErrorMessage}
                deleteImage={deleteImage}
                errorMessage={errorMessage}
                fileInputRef={fileInputRef}
                filesDropper={imageFilesDropper}
                imageMimeTypes={fileUploader.fileTypes.image.mimeTypes}
                images={images}
                isSelected={isSelected}
                reorderHandler={galleryReorder}
                uploader={imageUploader}
                onFileChange={onFileChange}
            />

            <ActionToolbar
                data-kg-card-toolbar="gallery"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="gallery"
                isVisible={!hideToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="add-gallery-image" icon="add" isActive={false} label="Add images" onClick={handleToolbarAdd} />
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
