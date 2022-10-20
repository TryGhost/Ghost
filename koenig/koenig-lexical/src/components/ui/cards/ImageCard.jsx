import React from 'react';
import PropTypes from 'prop-types';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as ImgPlaceholderIcon} from '../../../assets/icons/kg-img-placeholder.svg';
import ImageCardToolbar from '../ImageCardToolbar';

function PopulatedImageCard({src, alt}) {
    return (
        <img src={src} alt={alt} />
    );
}

function openFilePicker({fileInputRef}) {
    fileInputRef.current.click();
}

export function ImageUploadForm({onFileChange, fileInputRef}) {
    return (
        <form onChange={onFileChange}>
            <input
                name="image-input"
                type='file'
                accept='image/*'
                ref={fileInputRef}
                hidden={true}
            />
        </form>
    );
}

function EmptyImageCard({onFileChange}) {
    const fileInputRef = React.useRef(null);

    return (
        <>
            <MediaPlaceholder
                filePicker={() => openFilePicker({fileInputRef})}
                desc="Click to select an image"
                Icon={ImgPlaceholderIcon}
            />
            <ImageUploadForm
                filePicker={() => openFilePicker({fileInputRef})}
                onFileChange={onFileChange}
                fileInputRef={fileInputRef}
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
    setAltText
}) {
    const figureRef = React.useRef(null);
    const fileInputRef = React.useRef(null);

    return (
        <>
            {
                src ?
                    <>
                        <ImageCardToolbar
                            figureRef={figureRef}
                            filePicker={() => openFilePicker({fileInputRef})} 
                            isSelected={isSelected} 
                            fileInputRef={fileInputRef} 
                            onFileChange={onFileChange} />
                    </>
                    : <></>
            }
            <figure ref={figureRef}>
                {src
                    ? <PopulatedImageCard src={src} alt={altText} />
                    : <EmptyImageCard onFileChange={onFileChange} />
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
    setAltText: PropTypes.bool,
    caption: PropTypes.string,
    altText: PropTypes.string
};