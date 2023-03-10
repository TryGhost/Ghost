import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';

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
                icon='gallery'
                size='large'
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
    caption: PropTypes.string
};