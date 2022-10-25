import React from 'react';
import PropTypes from 'prop-types';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as VideoPlaceholderIcon} from '../../../assets/icons/kg-video-placeholder.svg';
import {openFileSelection} from '../../../utils/openFileSelection';
import ImageUploadForm from '../ImageUploadForm';

function EmptyVideoCard({onFileChange}) {
    const fileInputRef = React.useRef(null);
    return (
        <>
            <MediaPlaceholder
                filePicker={() => openFileSelection({fileInputRef})}
                desc="Click to select a video"
                Icon={VideoPlaceholderIcon}
            />
            <ImageUploadForm
                filePicker={() => openFileSelection({fileInputRef})}
                onFileChange={onFileChange}
                fileInputRef={fileInputRef}
            />
        </>
    );
}

export function VideoCard({
    isSelected,
    onFileChange,
    caption,
    setCaption,
    setFigureRef
}) {
    const figureRef = React.useRef(null);

    React.useEffect(() => {
        if (setFigureRef) {
            setFigureRef(figureRef);
        }
    }, [figureRef, setFigureRef]);
    
    return (
        <>
            <figure ref={figureRef}>
                <EmptyVideoCard onFileChange={onFileChange} />
                <CardCaptionEditor
                    caption={caption || ''}
                    setCaption={setCaption}
                    captionPlaceholder="Type caption for video (optional)"
                    isSelected={isSelected}
                />
            </figure>
        </>
    );
}

VideoCard.propTypes = {
    isSelected: PropTypes.bool,
    caption: PropTypes.string
};