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
                desc="Click to select up to 9 images"
                filePicker={openFilePicker}
                icon='gallery'
                size='large'
            />
            <form onChange={onFileChange}>
                <input
                    ref={fileInputRef}
                    accept='image/*'
                    hidden={true}
                    name="image-input"
                    type='file'
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
                captionPlaceholder="Type caption for gallery (optional)"
                isSelected={isSelected}
                setCaption={setCaption}
            />
        </figure>
    );
}

GalleryCard.propTypes = {
    caption: PropTypes.string
};