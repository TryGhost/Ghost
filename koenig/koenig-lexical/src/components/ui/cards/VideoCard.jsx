import React from 'react';
import PropTypes from 'prop-types';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {MediaPlayer} from '../MediaPlayer';
import {SettingsPanel} from '../SettingsPanel';
import {ReactComponent as PlayIcon} from '../../../assets/icons/kg-play.svg';
import {openFileSelection} from '../../../utils/openFileSelection';
import {VideoNode} from '@tryghost/kg-default-nodes';
import {ProgressBar} from '../ProgressBar';

function PopulatedVideoCard({
    thumbnail,
    customThumbnail,
    onCustomThumbnailChange,
    isCustomThumbnailLoading,
    customThumbnailUploadProgress,
    onRemoveCustomThumbnail,
    totalDuration,
    cardWidth,
    isLoopChecked,
    onChangeLoop,
    videoUploadProgress,
    isVideoLoading,
    onCardWidthChange,
    isEditing
}) {
    const progressStyle = {
        width: `${videoUploadProgress?.toFixed(0)}%`
    };

    return (
        <>
            <div className="not-kg-prose relative min-h-[430px]">
                <div>
                    <img className="mx-auto" src={thumbnail} alt="Video thumbnail" />
                    {customThumbnail && <img className="absolute inset-0 h-full w-full object-cover" src={customThumbnail} alt="Video custom thumbnail" />}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/0 via-black/5 to-black/30">
                    <button className="flex h-20 w-20 items-center justify-center rounded-full bg-black/50">
                        <PlayIcon className="h-auto w-5 fill-white" />
                    </button>
                </div>
                <div className={`absolute bottom-0 flex h-20 w-full justify-end bg-gradient-to-b from-black/0 to-black/50 ${cardWidth === 'full' ? 'px-7 py-4' : 'px-4'}`}>
                    <MediaPlayer duration={totalDuration} theme='light' />
                </div>
            </div>
            {
                isVideoLoading && (
                    <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50">
                        <ProgressBar style={progressStyle} />
                    </div>
                )
            }

            {
                !!thumbnail && !isVideoLoading && isEditing && (
                    <SettingsPanel
                        isLoopChecked={isLoopChecked}
                        onChangeLoop={onChangeLoop}
                        cardWidth={cardWidth}
                        onCardWidthChange={onCardWidthChange}
                        customThumbnail={customThumbnail}
                        onCustomThumbnailChange={onCustomThumbnailChange}
                        isCustomThumbnailLoading={isCustomThumbnailLoading}
                        customThumbnailUploadProgress={customThumbnailUploadProgress}
                        onRemoveCustomThumbnail={onRemoveCustomThumbnail}
                    />
                )
            }
        </>
    );
}

function EmptyVideoCard({onFileChange, fileInputRef}) {
    return (
        <>
            <MediaPlaceholder
                filePicker={() => openFileSelection({fileInputRef})}
                desc="Click to select a video"
                icon='video'
            />
            <form onChange={onFileChange}>
                <input
                    name="image-input"
                    type='file'
                    accept={VideoNode.mimeTypes}
                    ref={fileInputRef}
                    hidden={true}
                />
            </form>
        </>
    );
}

const VideoHolder = ({
    fileInputRef,
    onVideoFileChange,
    handleDrag,
    handleDrop,
    isDraggedOver,
    ...props
}) => {
    const showPopulatedCard = props.customThumbnail || props.thumbnail || props.isVideoLoading;
    if (showPopulatedCard) {
        return (
            <PopulatedVideoCard {...props}/>
        );
    } else {
        return (
            <EmptyVideoCard
                onFileChange={onVideoFileChange}
                fileInputRef={fileInputRef}
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                isDraggedOver={isDraggedOver}
            />
        );
    }
};

export function VideoCard({
    caption,
    onCaptionChange,
    isSelected,
    ...props
}) {
    return (
        <>
            <figure>
                <VideoHolder {...props} />
                <CardCaptionEditor
                    caption={caption || ''}
                    setCaption={onCaptionChange}
                    captionPlaceholder="Type caption for video (optional)"
                    isSelected={isSelected}
                />
            </figure>
        </>
    );
}

VideoCard.propTypes = {
    thumbnail: PropTypes.string,
    customThumbnail: PropTypes.string,
    totalDuration: PropTypes.string,
    caption: PropTypes.string
};
