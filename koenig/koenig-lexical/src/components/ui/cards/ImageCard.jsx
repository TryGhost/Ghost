import React from 'react';
import PropTypes from 'prop-types';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as ImgPlaceholderIcon} from '../../../assets/icons/kg-img-placeholder.svg';
import {openFileSelection} from '../../../utils/openFileSelection';
import ImageUploadForm from '../ImageUploadForm';

function PopulatedImageCard({src, alt}) {
    return (
        <img src={src} alt={alt} />
    );
}

function EmptyImageCard({onFileChange, setFileInputRef, handleDrag, handleDrop, isDraggedOver}) {
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
                Icon={ImgPlaceholderIcon}
                isDraggedOver={isDraggedOver}
            />
            <ImageUploadForm
                filePicker={() => openFileSelection({fileInputRef})}
                onFileChange={onFileChange}
                fileInputRef={onFileInputRef}
            />
        </>
    );
}

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
    cardWidth
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
                {src
                    ? <PopulatedImageCard src={src} alt={altText} />
                    : <EmptyImageCard
                        handleDrag={handleDrag} 
                        onFileChange={onFileChange} 
                        setFileInputRef={setFileInputRef}
                        handleDrop={handleDrop}
                        isDraggedOver={isDraggedOver}
                    />
                }
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
    isSelected: PropTypes.bool,
    setAltText: PropTypes.func,
    caption: PropTypes.string,
    altText: PropTypes.string,
    setCaption: PropTypes.func,
    src: PropTypes.string,
    isDraggedOver: PropTypes.bool
};
