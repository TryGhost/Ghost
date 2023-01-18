import React from 'react';
import PropTypes from 'prop-types';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {MediaPlayer} from '../MediaPlayer';
import {ReactComponent as VideoPlaceholderIcon} from '../../../assets/icons/kg-video-placeholder.svg';
import {ReactComponent as PlayIcon} from '../../../assets/icons/kg-play.svg';
import {openFileSelection} from '../../../utils/openFileSelection';
import ImageUploadForm from '../ImageUploadForm';

function PopulatedVideoCard({alt, thumbnail, customThumbnail, duration, cardWidth, ...args}) {
    return (
        <div className="relative" {...args}>
            <div>
                <img className="mx-auto" src={thumbnail} alt={alt} />
                {customThumbnail && <img className="absolute inset-0 h-full w-full object-cover" src={customThumbnail} alt={alt} />}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/0 via-black/5 to-black/30">
                <button className="flex h-20 w-20 items-center justify-center rounded-full bg-black/50">
                    <PlayIcon className="h-auto w-5 fill-white" />
                </button>
            </div>
            <div className={`absolute bottom-0 flex h-20 w-full justify-end bg-gradient-to-b from-black/0 to-black/50 ${cardWidth === 'full' ? 'px-7 py-4' : 'px-4'}`}>
                <MediaPlayer duration={duration} theme='light' />
            </div>
        </div>
    );
}

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

const ImageHolder = ({
    thumbnail,
    customThumbnail,
    duration,
    cardWidth,
    onFileChange,
    setFileInputRef,
    handleDrag,
    handleDrop,
    isDraggedOver
}) => {
    if (customThumbnail || thumbnail) {
        return (
            <PopulatedVideoCard 
                customThumbnail={customThumbnail}
                thumbnail={thumbnail}
                duration={duration}
                cardWidth={cardWidth}
            />
        );
    } else {
        return (
            <EmptyVideoCard
                handleDrag={handleDrag} 
                onFileChange={onFileChange} 
                setFileInputRef={setFileInputRef}
                handleDrop={handleDrop}
                isDraggedOver={isDraggedOver}
            />
        );
    }
};

export function VideoCard({
    isSelected,
    thumbnail,
    onFileChange,
    caption,
    setCaption,
    altText,
    setFigureRef,
    handleDrag,
    handleDrop,
    isDraggedOver,
    customThumbnail,
    totalDuration,
    cardWidth,
    uploadProgress
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
                <ImageHolder 
                    thumbnail={thumbnail}
                    altText={altText}
                    customThumbnail={customThumbnail}
                    duration={totalDuration}
                    cardWidth={cardWidth}
                    uploadProgress={uploadProgress}
                    onFileChange={onFileChange}
                    handleDrag={handleDrag}
                    handleDrop={handleDrop}
                    isDraggedOver={isDraggedOver} 
                />
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
    thumbnail: PropTypes.string,
    customThumbnail: PropTypes.string,
    totalDuration: PropTypes.string,
    caption: PropTypes.string
};