import React from 'react';
import PropTypes from 'prop-types';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ProgressBar} from '../ProgressBar';
import {openFileSelection} from '../../../utils/openFileSelection';
import ImageUploadForm from '../ImageUploadForm';

function PopulatedImageCard({src, alt, previewSrc, imageUploader}) {
    const progressStyle = {
        width: `${imageUploader.progress?.toFixed(0)}%`
    };

    const progressAlt = imageUploader.progress.toFixed(0) < 100 ? `upload in progress, ${imageUploader.progress}` : '';

    return (
        <div>
            <img
                className={`mx-auto block ${previewSrc ? 'opacity-40' : ''}`}
                src={previewSrc ? previewSrc : src}
                alt={alt ? alt : progressAlt}
                data-testid={imageUploader.isLoading ? 'image-card-loading' : 'image-card-populated'}
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
                placeholderRef={imageDragHandler.setRef}
                isDraggedOver={imageDragHandler.isDraggedOver}
                filePicker={() => openFileSelection({fileInputRef})}
                desc="Click to select an image"
                icon='image'
                errors={errors}
            />
            <ImageUploadForm
                filePicker={() => openFileSelection({fileInputRef})}
                onFileChange={onFileChange}
                fileInputRef={onFileInputRef}
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
                src={src}
                alt={altText}
                previewSrc={previewSrc}
                imageUploader={imageUploader}
            />
        );
    } else {
        return (
            <EmptyImageCard
                onFileChange={onFileChange}
                setFileInputRef={setFileInputRef}
                imageDragHandler={imageDragHandler}
                errors={imageUploader.errors}
            />
        );
    }
};

export function ImageCard({
    isSelected,
    src,
    onFileChange,
    caption,
    setCaption,
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
            <figure data-kg-card-width={cardWidth} ref={figureRef}>
                <ImageHolder
                    src={src}
                    altText={altText}
                    previewSrc={previewSrc}
                    imageUploader={imageUploader}
                    imageDragHandler={imageDragHandler}
                    onFileChange={onFileChange}
                    setFileInputRef={setFileInputRef}
                />
                <CardCaptionEditor
                    altText={altText || ''}
                    setAltText={setAltText}
                    altTextPlaceholder="Type alt text for image (optional)"
                    caption={caption || ''}
                    setCaption={setCaption}
                    captionPlaceholder="Type caption for image (optional)"
                    isSelected={isSelected}
                    readOnly={!isSelected}
                    dataTestId="image-caption-editor"
                />
            </figure>
        </>
    );
}

ImageCard.propTypes = {
    caption: PropTypes.string,
    altText: PropTypes.string,
    setCaption: PropTypes.func,
    src: PropTypes.string,
    isDraggedOver: PropTypes.bool,
    previewSrc: PropTypes.string
};
