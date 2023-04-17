import ImageUploadForm from '../ImageUploadForm';
import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ProgressBar} from '../ProgressBar';
import {openFileSelection} from '../../../utils/openFileSelection';

function PopulatedImageCard({src, alt, previewSrc, imageUploader}) {
    const progressStyle = {
        width: `${imageUploader.progress?.toFixed(0)}%`
    };

    const progressAlt = imageUploader.progress.toFixed(0) < 100 ? `upload in progress, ${imageUploader.progress}` : '';

    return (
        <div>
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
        </div>
    );
}

function EmptyImageCard({onFileChange, setFileInputRef, imageDragHandler, errors}) {
    const fileInputRef = React.useRef(null);

    const onFileInputRef = (element) => {
        fileInputRef.current = element;
        setFileInputRef(fileInputRef);
    };

    return (
        <>
            <MediaPlaceholder
                desc="Click to select an image"
                errors={errors}
                filePicker={() => openFileSelection({fileInputRef})}
                icon='image'
                isDraggedOver={imageDragHandler.isDraggedOver}
                placeholderRef={imageDragHandler.setRef}
            />
            <ImageUploadForm
                fileInputRef={onFileInputRef}
                filePicker={() => openFileSelection({fileInputRef})}
                onFileChange={onFileChange}
            />
        </>
    );
}

const ImageHolder = ({
    src,
    altText,
    previewSrc,
    imageUploader,
    onFileChange,
    setFileInputRef,
    imageDragHandler
}) => {
    if (previewSrc || src) {
        return (
            <PopulatedImageCard
                alt={altText}
                imageUploader={imageUploader}
                previewSrc={previewSrc}
                src={src}
            />
        );
    } else {
        return (
            <EmptyImageCard
                errors={imageUploader.errors}
                imageDragHandler={imageDragHandler}
                setFileInputRef={setFileInputRef}
                onFileChange={onFileChange}
            />
        );
    }
};

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
    imageDragHandler
}) {
    const figureRef = React.useRef(null);

    React.useEffect(() => {
        if (setFigureRef) {
            setFigureRef(figureRef);
        }
    }, [figureRef, setFigureRef]);

    const setFileInputRef = (ref) => {
        if (fileInputRef) {
            fileInputRef.current = ref.current;
        }
    };
    return (
        <>
            <figure ref={figureRef} data-kg-card-width={cardWidth}>
                <ImageHolder
                    altText={altText}
                    imageDragHandler={imageDragHandler}
                    imageUploader={imageUploader}
                    previewSrc={previewSrc}
                    setFileInputRef={setFileInputRef}
                    src={src}
                    onFileChange={onFileChange}
                />
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
            </figure>
        </>
    );
}

ImageHolder.propTypes = {
    src: PropTypes.string,
    altText: PropTypes.string,
    previewSrc: PropTypes.string,
    imageUploader: PropTypes.object,
    onFileChange: PropTypes.func,
    setFileInputRef: PropTypes.func,
    imageDragHandler: PropTypes.object
};

ImageCard.propTypes = {
    isSelected: PropTypes.bool,
    src: PropTypes.string,
    onFileChange: PropTypes.func,
    captionEditor: PropTypes.object,
    captionEditorInitialState: PropTypes.string,
    altText: PropTypes.string,
    setAltText: PropTypes.func,
    setFigureRef: PropTypes.func,
    fileInputRef: PropTypes.object,
    cardWidth: PropTypes.string,
    previewSrc: PropTypes.string,
    imageUploader: PropTypes.object,
    imageDragHandler: PropTypes.object
};