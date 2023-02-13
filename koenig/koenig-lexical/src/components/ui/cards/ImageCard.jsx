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
            <img className={`mx-auto block ${previewSrc ? 'opacity-40' : ''}`} src={previewSrc ? previewSrc : src} alt={alt ? alt : progressAlt} />
            {imageUploader.isLoading ?
                <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50" data-testid="upload-progress">
                    <ProgressBar style={progressStyle} />
                </div>
                : <></>
            }
        </div>
    );
}

function EmptyImageCard({onFileChange, setFileInputRef, handleDrag, handleDrop, isDraggedOver, errors}) {
    const fileInputRef = React.useRef(null);

    const onFileInputRef = (element) => {
        fileInputRef.current = element;
        setFileInputRef(fileInputRef);
    };

    return (
        <>
            <MediaPlaceholder
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                filePicker={() => openFileSelection({fileInputRef})}
                desc="Click to select an image"
                icon='image'
                isDraggedOver={isDraggedOver}
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
    handleDrag,
    handleDrop,
    isDraggedOver,
    imageUploadErrors
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
                handleDrag={handleDrag}
                onFileChange={onFileChange}
                setFileInputRef={setFileInputRef}
                handleDrop={handleDrop}
                isDraggedOver={isDraggedOver}
                errors={imageUploadErrors}
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
    handleDrag,
    handleDrop,
    isDraggedOver,
    cardWidth,
    previewSrc,
    imageUploader,
    imageUploadErrors
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
                    onFileChange={onFileChange}
                    setFileInputRef={setFileInputRef}
                    handleDrag={handleDrag}
                    handleDrop={handleDrop}
                    isDraggedOver={isDraggedOver}
                    imageUploadErrors={imageUploadErrors}
                />
                <CardCaptionEditor
                    altText={altText || ''}
                    setAltText={setAltText}
                    altTextPlaceholder="Type alt text for image (optional)"
                    caption={caption || ''}
                    setCaption={setCaption}
                    captionPlaceholder="Type caption for image (optional)"
                    isSelected={isSelected}
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
