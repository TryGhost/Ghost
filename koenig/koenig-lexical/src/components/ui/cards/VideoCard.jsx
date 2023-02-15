import React from 'react';
import PropTypes from 'prop-types';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {MediaPlayer} from '../MediaPlayer';
import {SettingsPanel, ToggleSetting, ButtonGroupSetting, ThumbnailSetting} from '../SettingsPanel';
import {ReactComponent as ImageRegularIcon} from '../../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImageWideIcon} from '../../../assets/icons/kg-img-wide.svg';
import {ReactComponent as ImageFullIcon} from '../../../assets/icons/kg-img-full.svg';
import {ReactComponent as PlayIcon} from '../../../assets/icons/kg-play.svg';
import {openFileSelection} from '../../../utils/openFileSelection';
import {ProgressBar} from '../ProgressBar';

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
                    <img className="mx-auto" src={thumbnail} alt="Video thumbnail" />
                    {customThumbnail && <img className="absolute inset-0 h-full w-full object-cover" src={customThumbnail} alt="Video custom thumbnail" />}
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
                        <ProgressBar style={progressStyle} bgStyle='transparent' />
                    </div>
                )
            }

            {
                !!thumbnail && !videoUploader.isLoading && isEditing && (
                    <SettingsPanel>
                        <ButtonGroupSetting
                            label="Video width"
                            onClick={onCardWidthChange}
                            selectedName={cardWidth}
                            buttons={buttonGroupChildren}
                        />
                        <ToggleSetting
                            label='Loop'
                            description='Autoplay your video on a loop without sound.'
                            isChecked={isLoopChecked}
                            onChange={onLoopChange}
                            dataTestID="loop-video"
                        />
                        {!isLoopChecked && (
                            <ThumbnailSetting
                                label='Custom thumbnail'
                                icon='file'
                                size='xsmall'
                                src={customThumbnail}
                                alt='Custom thumbnail'
                                onFileChange={onCustomThumbnailChange}
                                isLoading={customThumbnailUploader.isLoading}
                                dataTestID="custom-thumbnail-replace"
                                progress={customThumbnailUploader.progress}
                                errors={customThumbnailUploader.errors}
                                onRemoveCustomThumbnail={onRemoveCustomThumbnail}
                                isDraggedOver={thumbnailDragHandler.isDraggedOver}
                                placeholderRef={thumbnailDragHandler.setRef}
                                mimeTypes={thumbnailMimeTypes}
                            />
                        )}
                    </SettingsPanel>
                )
            }
        </>
    );
}

function EmptyVideoCard({onFileChange, fileInputRef, errors, videoMimeTypes, videoDragHandler = {}}) {
    return (
        <>
            <MediaPlaceholder
                filePicker={() => openFileSelection({fileInputRef})}
                desc="Click to select a video"
                icon='video'
                isDraggedOver={videoDragHandler.isDraggedOver}
                placeholderRef={videoDragHandler.setRef}
                errors={errors}
            />
            <form onChange={onFileChange}>
                <input
                    name="image-input"
                    type='file'
                    accept={videoMimeTypes.join(',')}
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
                onFileChange={onVideoFileChange}
                fileInputRef={fileInputRef}
                videoDragHandler={videoDragHandler}
                videoMimeTypes={videoMimeTypes}
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
                    setCaption={onCaptionChange}
                    captionPlaceholder="Type caption for video (optional)"
                    isSelected={isSelected}
                    readOnly={!isEditing}
                    dataTestId="video-card-caption"
                />
            </figure>
        </>
    );
}

VideoCard.propTypes = {
    caption: PropTypes.string
};
