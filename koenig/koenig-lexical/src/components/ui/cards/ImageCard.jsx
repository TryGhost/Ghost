import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as ImgPlaceholderIcon} from '../../../assets/icons/kg-img-placeholder.svg';

function PopulatedImageCard({src, alt}) {
    return (
        <img src={src} alt={alt} />
    );
}

function EmptyImageCard({onFileChange}) {
    const fileInputRef = React.useRef(null);

    const openFilePicker = () => {
        fileInputRef.current.click();
    };

    return (
        <>
            <MediaPlaceholder
                onClick={openFilePicker}
                desc="Click to select an image"
                Icon={ImgPlaceholderIcon}
            />
            <form onChange={onFileChange}>
                <input
                    name="image-input"
                    type='file'
                    accept='image/*'
                    ref={fileInputRef}
                    hidden={true}
                />
            </form>
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
    return (
        <figure>
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
    );
}
