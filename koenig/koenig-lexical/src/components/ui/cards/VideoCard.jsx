import PropTypes from 'prop-types';
import React from 'react';
import {ButtonGroupSetting, SettingsPanel, ThumbnailSetting, ToggleSetting} from '../SettingsPanel';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {ReactComponent as ImageFullIcon} from '../../../assets/icons/kg-img-full.svg';
import {ReactComponent as ImageRegularIcon} from '../../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImageWideIcon} from '../../../assets/icons/kg-img-wide.svg';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {MediaPlayer} from '../MediaPlayer';
import {ReactComponent as PlayIcon} from '../../../assets/icons/kg-play.svg';
import {ProgressBar} from '../ProgressBar';
import {openFileSelection} from '../../../utils/openFileSelection';

function PopulatedVideoCard({
    thumbnail,
    customThumbnail,
    onCustomThumbnailChange,
    videoUploader = {},
    customThumbnailUploader = {},
    onRemoveCustomThumbnail,
    totalDuration,
    cardWidth,
    isLoopChecked,
    onLoopChange,
    onCardWidthChange,
    isEditing,
    thumbnailMimeTypes,
    thumbnailDragHandler = {}
}) {
    const progressStyle = {
        width: `${videoUploader.progress?.toFixed(0)}%`
    };

    const buttonGroupChildren = [
        {
            label: 'Regular',
            name: 'regular',
            Icon: ImageRegularIcon
        },
        {
            label: 'Wide',
            name: 'wide',
            Icon: ImageWideIcon
        },
        {
            label: 'Full',
            name: 'full',
            Icon: ImageFullIcon
        }
    ];

    return (
        <>
            <div className="not-kg-prose relative" data-testid="video-card-populated">
                <div>
                    <img alt="Video thumbnail" className="mx-auto" src={thumbnail} />
                    {customThumbnail && <img alt="Video custom thumbnail" className="absolute inset-0 h-full w-full object-cover" src={customThumbnail} />}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/0 via-black/5 to-black/30">
                    {videoUploader.isLoading || (
                        <button className="flex h-20 w-20 items-center justify-center rounded-full bg-black/50">
                            <PlayIcon className="h-auto w-5 fill-white" />
                        </button>
                    )}
                </div>
                <div className={`absolute bottom-0 flex h-20 w-full justify-end bg-gradient-to-b from-black/0 to-black/50 ${cardWidth === 'full' ? 'px-7 py-4' : 'px-4'}`}>
                    <MediaPlayer duration={totalDuration} theme='light' />
                </div>
            </div>
            {
                videoUploader.isLoading && (
                    <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50" data-testid="video-progress">
                        <ProgressBar bgStyle='transparent' style={progressStyle} />
                    </div>
                )
            }

            {
                !!thumbnail && !videoUploader.isLoading && isEditing && (
                    <SettingsPanel>
                        <ButtonGroupSetting
                            buttons={buttonGroupChildren}
                            label="Video width"
                            selectedName={cardWidth}
                            onClick={onCardWidthChange}
                        />
                        <ToggleSetting
                            dataTestID="loop-video"
                            description='Autoplay your video on a loop without sound.'
                            isChecked={isLoopChecked}
                            label='Loop'
                            onChange={onLoopChange}
                        />
                        {!isLoopChecked && (
                            <ThumbnailSetting
                                alt='Custom thumbnail'
                                dataTestID="custom-thumbnail-replace"
                                errors={customThumbnailUploader.errors}
                                icon='file'
                                isDraggedOver={thumbnailDragHandler.isDraggedOver}
                                isLoading={customThumbnailUploader.isLoading}
                                label='Custom thumbnail'
                                mimeTypes={thumbnailMimeTypes}
                                placeholderRef={thumbnailDragHandler.setRef}
                                progress={customThumbnailUploader.progress}
                                size='xsmall'
                                src={customThumbnail}
                                onFileChange={onCustomThumbnailChange}
                                onRemoveCustomThumbnail={onRemoveCustomThumbnail}
                            />
                        )}
                    </SettingsPanel>
                )
            }
        </>
    );
}

function EmptyVideoCard({onFileChange, fileInputRef, errors, videoMimeTypes = [], videoDragHandler = {}}) {
    return (
        <>
            <MediaPlaceholder
                desc="Click to select a video"
                errors={errors}
                filePicker={() => openFileSelection({fileInputRef})}
                icon='video'
                isDraggedOver={videoDragHandler.isDraggedOver}
                placeholderRef={videoDragHandler.setRef}
            />
            <form onChange={onFileChange}>
                <input
                    ref={fileInputRef}
                    accept={videoMimeTypes.join(',')}
                    hidden={true}
                    name="image-input"
                    type='file'
                />
            </form>
        </>
    );
}

const VideoHolder = ({
    fileInputRef,
    onVideoFileChange,
    videoDragHandler,
    videoUploader = {},
    videoUploadErrors,
    videoMimeTypes,
    ...props
}) => {
    const showPopulatedCard = props.customThumbnail || props.thumbnail || videoUploader.isLoading;
    if (showPopulatedCard) {
        return (
            <PopulatedVideoCard {...props} videoUploader={videoUploader}/>
        );
    } else {
        return (
            <EmptyVideoCard
                errors={videoUploadErrors}
                fileInputRef={fileInputRef}
                videoDragHandler={videoDragHandler}
                videoMimeTypes={videoMimeTypes}
                onFileChange={onVideoFileChange}
            />
        );
    }
};

export function VideoCard({
    caption,
    onCaptionChange,
    isSelected,
    isEditing,
    ...props
}) {
    return (
        <>
            <figure>
                <VideoHolder {...props} isEditing={isEditing} />
                <CardCaptionEditor
                    caption={caption || ''}
                    captionPlaceholder="Type caption for video (optional)"
                    dataTestId="video-card-caption"
                    isSelected={isSelected}
                    readOnly={!isEditing}
                    setCaption={onCaptionChange}
                />
            </figure>
        </>
    );
}

VideoCard.propTypes = {
    caption: PropTypes.string
};
