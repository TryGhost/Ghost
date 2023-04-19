import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useDragAndDrop from '../hooks/useDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {GalleryCard} from '../components/ui/cards/GalleryCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {getImageDimensions} from '../utils/getImageDimensions';
import {pick} from 'lodash-es';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const MAX_IMAGES = 9;
const MAX_PER_ROW = 3;

// ensure we don't save client-side only properties such as preview blob urls to the server
const ALLOWED_IMAGE_PROPS = ['row', 'src', 'width', 'height', 'alt', 'caption', 'fileName'];

function recalculateImageRows(images) {
    images.forEach((image, idx) => {
        image.row = Math.ceil((idx + 1) / MAX_PER_ROW) - 1;
    });
}

export function GalleryNodeComponent({nodeKey, captionEditor, captionEditorInitialState}) {
    const [editor] = useLexicalComposerContext();
    const {selectedCardKey} = useKoenigSelectedCardContext();
    const {fileUploader} = React.useContext(KoenigComposerContext);

    const fileInputRef = React.useRef();
    const [errorMessage, setErrorMessage] = React.useState(null);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [images, setImages] = React.useState(() => {
        const existingImages = editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey);
            return node.getImages();
        });
        return existingImages;
    });

    const imageUploader = fileUploader.useFileUpload('image');
    const imageFilesDropper = useDragAndDrop({handleDrop: handleImageFilesDrop});

    const isSelected = selectedCardKey === nodeKey;

    const setNodeImages = (newImages) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            const datasetImages = newImages.map(image => pick(image, ALLOWED_IMAGE_PROPS));
            recalculateImageRows(datasetImages);
            node.setImages(datasetImages);
        });
    };

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

        // TODO: handle upload failures
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

    const clearErrorMessage = () => {
        setErrorMessage(null);
    };

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
                uploader={imageUploader}
                onFileChange={onFileChange}
            />

            <ActionToolbar
                data-kg-card-toolbar="image"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>
        </>
    );
}
