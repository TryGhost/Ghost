import DeleteIcon from '../../../assets/icons/kg-trash.svg?react';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {IconButton} from '../IconButton';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ProgressBar} from '../ProgressBar';
import type {GalleryImage} from '../../../types/GalleryImage';
import type {LexicalEditor} from 'lexical';

interface GalleryRowProps {
    index: number;
    images: GalleryImage[];
    deleteImage?: (image: GalleryImage) => void;
    isDragging?: boolean;
}

function GalleryRow({index, images, deleteImage, isDragging}: GalleryRowProps) {
    const GalleryImages = images.map((image, idx) => {
        const position =
            images.length === 1 ? 'single' :
                idx === 0 ? 'first' :
                    idx === images.length - 1 ? 'last' :
                        'middle';

        return <GalleryImageComponent key={image.src} deleteImage={deleteImage} image={image} isDragging={isDragging} position={position} />;
    });

    return (
        <div className={`flex flex-row justify-center ${index !== 0 && 'mt-4'}`} data-row={index}>
            {GalleryImages}
        </div>
    );
}

interface GalleryImageComponentProps {
    image: GalleryImage;
    deleteImage?: (image: GalleryImage) => void;
    position: string;
    isDragging?: boolean;
}

function GalleryImageComponent({image, deleteImage, position, isDragging}: GalleryImageComponentProps) {
    const aspectRatio = (image.width || 1) / (image.height || 1);
    const style = {
        flex: `${aspectRatio} 1 0%`
    };

    let classes: string[] = [];
    let overlayClasses: string[] = [];

    switch (position) {
    case 'first':
        classes = ['pr-2'];
        overlayClasses = ['mr-2'];
        break;
    case 'middle':
        classes = ['pl-2', 'pr-2'];
        overlayClasses = ['ml-2', 'mr-2'];
        break;
    case 'last':
        classes = ['pl-2'];
        overlayClasses = ['ml-2'];
        break;
    default:
    }

    return (
        <div
            className={`group/image relative ${classes.join(' ')}`}
            data-testid="gallery-image"
            style={style}
            data-image
        >
            <img
                alt={image.alt}
                className="pointer-events-none block size-full"
                height={image.height}
                src={image.previewSrc || image.src}
                width={image.width}
            />

            {isDragging ? null : (
                <div className={`pointer-events-none invisible absolute inset-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 p-3 opacity-0 transition-all group-hover/image:visible group-hover/image:opacity-100 ${overlayClasses.join(' ')}`}>
                    <div className="flex flex-row-reverse">
                        <IconButton Icon={DeleteIcon} label="Delete" onClick={() => deleteImage?.(image)} />
                    </div>
                </div>
            )}
        </div>
    );
}

interface PopulatedGalleryCardProps {
    images: GalleryImage[];
    deleteImage?: (image: GalleryImage) => void;
    reorderHandler: {setContainerRef?: React.Ref<HTMLDivElement>; isDraggedOver?: boolean};
    isDragging?: boolean;
}

function PopulatedGalleryCard({images, deleteImage, reorderHandler, isDragging}: PopulatedGalleryCardProps) {
    const rows: GalleryImage[][] = [];
    const noOfImages = images.length;

    // 3 images per row unless last row would have a single image in which
    // case the last 2 rows will have 2 images
    const maxImagesInRow = function (idx: number) {
        return noOfImages > 1 && (noOfImages % 3 === 1) && (idx === (noOfImages - 2));
    };

    images.forEach((image, idx) => {
        let row = image.row || 0;

        // start a new display row if necessary
        if (maxImagesInRow(idx)) {
            row = row + 1;
        }

        if (!rows[row]) {
            rows[row] = [];
        }

        rows[row].push(image);
    });

    const GalleryRows = rows.map((rowImages, idx) => {
        return <GalleryRow key={rowImages[0].src} deleteImage={deleteImage} images={rowImages} index={idx} isDragging={isDragging} />;
    });

    return (
        <div ref={reorderHandler.setContainerRef} className="not-kg-prose flex flex-col" data-gallery>
            {GalleryRows}
        </div>
    );
}

interface EmptyGalleryCardProps {
    openFilePicker: () => void;
    isDraggedOver?: boolean;
    reorderHandler: {setContainerRef?: React.Ref<HTMLDivElement>};
}

function EmptyGalleryCard({openFilePicker, isDraggedOver, reorderHandler}: EmptyGalleryCardProps) {
    return (
        <MediaPlaceholder
            desc="Click to select up to 9 images"
            filePicker={openFilePicker}
            icon='gallery'
            isDraggedOver={isDraggedOver}
            multiple={true}
            placeholderRef={reorderHandler.setContainerRef}
            size='large'
        />
    );
}

function UploadOverlay({progress}: {progress?: number}) {
    const progressStyle = {
        width: `${(progress ?? 0).toFixed(0)}%`
    };

    return (
        <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50" data-testid="gallery-progress">
            <ProgressBar bgStyle="transparent" style={progressStyle} />
        </div>
    );
}

function FileDragOverlay() {
    return (
        <div className="bg-black-60 pointer-events-none absolute inset-0 flex items-center bg-black/60" data-kg-card-drag-text>
            <span className="sans-serif fw7 f7 block w-full text-center font-bold text-white">
                Drop to add up to 9 images
            </span>
        </div>
    );
}

interface GalleryCardProps {
    captionEditor?: LexicalEditor;
    captionEditorInitialState?: string;
    clearErrorMessage?: () => void;
    deleteImage?: (image: GalleryImage) => void;
    filesDropper: {isDraggedOver?: boolean; setRef?: React.Ref<HTMLDivElement>};
    errorMessage?: string;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    imageMimeTypes?: string[];
    images?: GalleryImage[];
    isSelected?: boolean;
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploader?: {isLoading?: boolean; progress?: number};
    reorderHandler?: {setContainerRef?: React.Ref<HTMLDivElement>; isDraggedOver?: boolean};
}

export function GalleryCard({
    captionEditor,
    captionEditorInitialState,
    clearErrorMessage,
    deleteImage,
    filesDropper,
    errorMessage,
    fileInputRef,
    imageMimeTypes = [],
    images = [],
    isSelected,
    onFileChange,
    uploader = {},
    reorderHandler = {}
}: GalleryCardProps) {
    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    const {isLoading, progress} = uploader;
    const {isDraggedOver: filesDraggedOver} = filesDropper;
    const {isDraggedOver: reorderDraggedOver} = reorderHandler;
    const isDragging = filesDraggedOver || reorderDraggedOver;

    return (
        <figure>
            <div ref={filesDropper.setRef} className="not-kg-prose relative" data-testid="gallery-container">
                {images.length
                    ? <PopulatedGalleryCard deleteImage={deleteImage} images={images} isDragging={isDragging} reorderHandler={reorderHandler} />
                    : <EmptyGalleryCard isDraggedOver={isDragging} openFilePicker={openFilePicker} reorderHandler={reorderHandler} />
                }

                {isLoading ? <UploadOverlay progress={progress} /> : null}
                {images.length && filesDraggedOver ? <FileDragOverlay /> : null}

                {errorMessage && !isDragging ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60" data-testid="gallery-error">
                        <span className="center sans-serif f7 block bg-red px-2 font-bold text-white">
                            {errorMessage}.
                            <button className="ml-2 cursor-pointer underline" data-testid="clear-gallery-error" type="button" onClick={clearErrorMessage}>
                                Dismiss
                            </button>
                        </span>
                    </div>
                ) : null}

                <form onChange={onFileChange as unknown as React.FormEventHandler<HTMLFormElement>}>
                    <input
                        ref={fileInputRef as React.RefObject<HTMLInputElement>}
                        accept={imageMimeTypes.join(',')}
                        hidden={true}
                        multiple={true}
                        name="image-input"
                        type='file'
                    />
                </form>
            </div>

            {captionEditor && (
                <CardCaptionEditor
                    captionEditor={captionEditor}
                    captionEditorInitialState={captionEditorInitialState}
                    captionPlaceholder="Type caption for gallery (optional)"
                    dataTestId="gallery-card-caption"
                    isSelected={isSelected}
                />
            )}
        </figure>
    );
}
