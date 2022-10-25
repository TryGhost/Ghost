import React from 'react';
import PropTypes from 'prop-types';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as GalleryPlaceholderIcon} from '../../../assets/icons/kg-gallery-placeholder.svg';

function EmptyGalleryCard({onFileChange}) {
    const fileInputRef = React.useRef(null);

    const openFilePicker = () => {
        fileInputRef.current.click();
    };

    return (
        <>
            <MediaPlaceholder
                filePicker={openFilePicker}
                desc="Click to select up to 9 images"
                Icon={GalleryPlaceholderIcon}
                type='gallery'
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

export function GalleryCard({
    isSelected,
    onFileChange,
    caption,
    setCaption
}) {
    return (
        <figure>
            <EmptyGalleryCard onFileChange={onFileChange} />
            <CardCaptionEditor
                caption={caption || ''}
                setCaption={setCaption}
                captionPlaceholder="Type caption for gallery (optional)"
                isSelected={isSelected}
            />
        </figure>
    );
}

GalleryCard.propTypes = {
    isSelected: PropTypes.bool,
    caption: PropTypes.string
};