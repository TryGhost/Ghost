import ImageUploadForm from '../ImageUploadForm';
import React from 'react';
import WandIcon from '../../../assets/icons/kg-wand.svg?react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {CardText, MediaPlaceholder} from '../MediaPlaceholder';
import {IconButton} from '../IconButton';
import {ProgressBar} from '../ProgressBar';
import {createFileInputChangeEventFromBlob} from '../../../utils/createFileInputChangeEvent';
import {isGif} from '../../../utils/isGif';
import {openFileSelection} from '../../../utils/openFileSelection';
import type {CardWidth} from '@tryghost/kg-default-nodes';
import type {LexicalEditor} from 'lexical';
import type {OpenImageEditor} from '../../../hooks/usePinturaEditor';

interface FileUploader {
    isLoading?: boolean;
    progress?: number;
    errors?: {message: string}[];
}

interface DragHandler {
    isDraggedOver?: boolean;
    setRef?: ((el: HTMLElement | null) => void) | React.Ref<HTMLDivElement>;
}

interface PopulatedImageCardProps {
    src?: string;
    alt?: string;
    previewSrc?: string;
    imageUploader: FileUploader;
    imageCardDragHandler?: DragHandler;
    imageFileDragHandler?: DragHandler;
    isPinturaEnabled?: boolean;
    openImageEditor?: OpenImageEditor;
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function PopulatedImageCard({src, alt, previewSrc, imageUploader, imageCardDragHandler, imageFileDragHandler, isPinturaEnabled, openImageEditor, onFileChange}: PopulatedImageCardProps) {
    const progressStyle = {
        width: `${(imageUploader.progress ?? 0).toFixed(0)}%`
    };

    const progressAlt = (imageUploader.progress || 0) < 100 ? `upload in progress, ${imageUploader.progress}` : '';

    function setRef(element: HTMLDivElement | null) {
        if (typeof imageFileDragHandler?.setRef === 'function') {
            imageFileDragHandler.setRef(element);
        }
        if (typeof imageCardDragHandler?.setRef === 'function') {
            imageCardDragHandler.setRef(element);
        }
    }

    return (
        <div ref={setRef} className="not-kg-prose group/image relative">
            <img
                alt={alt ? alt : progressAlt}
                className={`mx-auto block ${previewSrc ? 'opacity-40' : ''}`}
                data-testid={imageUploader.isLoading ? 'image-card-loading' : 'image-card-populated'}
                src={previewSrc ? previewSrc : src}
            />
            {imageUploader.isLoading ?
                <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50" data-testid="upload-progress">
                    <ProgressBar style={progressStyle} />
                </div>
                : <></>
            }
            {imageCardDragHandler?.isDraggedOver ? (
                <div className={`absolute inset-0 flex items-center justify-center border border-grey/20 bg-black/80 dark:border-grey/10 dark:bg-grey-950`}>
                    <CardText text="Drop to convert to a gallery" />
                </div>
            ) : null}
            {imageFileDragHandler?.isDraggedOver ? (
                <div className={`absolute inset-0 flex items-center justify-center border border-grey/20 bg-black/80 dark:border-grey/10 dark:bg-grey-950`} data-testid="drag-overlay">
                    <CardText text="Drop to replace image" />
                </div>
            ) : null}
            {(isPinturaEnabled && !isGif(src || '')) &&
                <div className={`pointer-events-none invisible absolute inset-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 p-3 opacity-0 transition-all group-hover/image:visible group-hover/image:opacity-100`}>
                    <div className="flex flex-row-reverse">
                        <IconButton Icon={WandIcon} label="Edit" onClick={() => openImageEditor?.({
                            image: src || '',
                            handleSave: (editedImage: Blob) => {
                                onFileChange?.(createFileInputChangeEventFromBlob(editedImage));
                            }
                        })} />
                    </div>
                </div>
            }
        </div>
    );
}

interface EmptyImageCardProps {
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setFileInputRef: (ref: React.RefObject<HTMLInputElement | null>) => void;
    imageFileDragHandler?: DragHandler;
    errors?: {message: string}[];
}

function EmptyImageCard({onFileChange, setFileInputRef, imageFileDragHandler, errors}: EmptyImageCardProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const onFileInputRef = (element: HTMLInputElement | null) => {
        (fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
        setFileInputRef(fileInputRef);
    };

    return (
        <>
            <MediaPlaceholder
                desc="Click to select an image"
                errors={errors}
                filePicker={() => openFileSelection({fileInputRef})}
                icon='image'
                isDraggedOver={imageFileDragHandler?.isDraggedOver}
                placeholderRef={imageFileDragHandler?.setRef}
            />
            <ImageUploadForm
                fileInputRef={onFileInputRef}
                filePicker={() => openFileSelection({fileInputRef})}
                onFileChange={onFileChange!}
            />
        </>
    );
}

interface ImageHolderProps {
    src?: string;
    altText?: string;
    previewSrc?: string;
    imageUploader: FileUploader;
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setFileInputRef: (ref: React.RefObject<HTMLInputElement | null>) => void;
    imageCardDragHandler?: DragHandler;
    imageFileDragHandler?: DragHandler;
    isPinturaEnabled?: boolean;
    openImageEditor?: OpenImageEditor;
}

const ImageHolder = ({
    src,
    altText,
    previewSrc,
    imageUploader,
    onFileChange,
    setFileInputRef,
    imageCardDragHandler,
    imageFileDragHandler,
    isPinturaEnabled,
    openImageEditor
}: ImageHolderProps) => {
    if (previewSrc || src) {
        return (
            <PopulatedImageCard
                alt={altText}
                imageCardDragHandler={imageCardDragHandler}
                imageFileDragHandler={imageFileDragHandler}
                imageUploader={imageUploader}
                isPinturaEnabled={isPinturaEnabled}
                openImageEditor={openImageEditor}
                previewSrc={previewSrc}
                src={src}
                onFileChange={onFileChange}
            />
        );
    } else {
        return (
            <EmptyImageCard
                errors={imageUploader.errors}
                imageFileDragHandler={imageFileDragHandler}
                setFileInputRef={setFileInputRef}
                onFileChange={onFileChange}
            />
        );
    }
};

interface ImageCardProps {
    isSelected?: boolean;
    src?: string;
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    captionEditor?: LexicalEditor;
    captionEditorInitialState?: string;
    altText?: string;
    setAltText?: (value: string) => void;
    setFigureRef?: (ref: React.RefObject<HTMLElement | null>) => void;
    fileInputRef?: React.MutableRefObject<HTMLInputElement | null>;
    cardWidth?: CardWidth;
    previewSrc?: string;
    imageUploader: FileUploader;
    imageCardDragHandler?: DragHandler;
    imageFileDragHandler?: DragHandler;
    isPinturaEnabled?: boolean;
    openImageEditor?: OpenImageEditor;
}

export function ImageCard({
    isSelected,
    src,
    onFileChange,
    captionEditor,
    captionEditorInitialState,
    altText,
    setAltText,
    setFigureRef,
    fileInputRef,
    cardWidth,
    previewSrc,
    imageUploader,
    imageCardDragHandler,
    imageFileDragHandler,
    isPinturaEnabled,
    openImageEditor
}: ImageCardProps) {
    const figureRef = React.useRef<HTMLElement>(null);

    React.useEffect(() => {
        if (setFigureRef) {
            setFigureRef(figureRef);
        }
    }, [figureRef, setFigureRef]);

    const setFileInputRef = (ref: React.RefObject<HTMLInputElement | null>) => {
        if (fileInputRef) {
            fileInputRef.current = ref.current;
        }
    };
    return (
        <>
            <figure ref={figureRef} data-kg-card-width={cardWidth}>
                <ImageHolder
                    altText={altText}
                    imageCardDragHandler={imageCardDragHandler}
                    imageFileDragHandler={imageFileDragHandler}
                    imageUploader={imageUploader}
                    isPinturaEnabled={isPinturaEnabled}
                    openImageEditor={openImageEditor}
                    previewSrc={previewSrc}
                    setFileInputRef={setFileInputRef}
                    src={src}
                    onFileChange={onFileChange}
                />
                {captionEditor && (
                    <CardCaptionEditor
                        altText={altText || ''}
                        altTextPlaceholder="Type alt text for image (optional)"
                        captionEditor={captionEditor}
                        captionEditorInitialState={captionEditorInitialState}
                        captionPlaceholder="Type caption for image (optional)"
                        dataTestId="image-caption-editor"
                        isSelected={isSelected}
                        readOnly={!isSelected}
                        setAltText={setAltText}
                    />
                )}
            </figure>
        </>
    );
}
