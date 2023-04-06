import PropTypes from 'prop-types';
import React from 'react';
import {ReactComponent as AudioFileIcon} from '../../../assets/icons/kg-audio-file.svg';
import {AudioUploadForm} from '../AudioUploadForm';
import {ReactComponent as DeleteIcon} from '../../../assets/icons/kg-trash.svg';
import {ReactComponent as FilePlaceholderIcon} from '../../../assets/icons/kg-file-placeholder.svg';
import {IconButton} from '../IconButton';
import {ImageUploadForm} from '../ImageUploadForm';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {MediaPlayer} from '../MediaPlayer';
import {ProgressBar} from '../ProgressBar';
import {openFileSelection} from '../../../utils/openFileSelection';

function AudioUploading({progress}) {
    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
    };

    return (
        <div className="h-full border border-transparent">
            <div className="relative flex h-full items-center justify-center border border-grey/20 bg-grey-50 before:pb-[12.5%]">
                <div className="flex w-full items-center justify-center overflow-hidden">
                    <ProgressBar style={progressStyle} />
                </div>
            </div>
        </div>
    );
}

function EmptyAudioCard({
    audioUploader,
    audioMimeTypes,
    onFileChange,
    setFileInputRef,
    audioDragHandler = {}
}) {
    const {isLoading: isUploading, progress, errors} = audioUploader;
    const fileInputRef = React.useRef(null);

    const onFileInputRef = (element) => {
        fileInputRef.current = element;
        setFileInputRef(fileInputRef);
    };

    if (isUploading) {
        return (<AudioUploading progress={progress} />);
    } else {
        return (
            <>
                <MediaPlaceholder
                    desc='Click to upload an audio file'
                    errorDataTestId="audio-upload-errors"
                    errors={errors}
                    filePicker={() => openFileSelection({fileInputRef: fileInputRef})}
                    icon='audio'
                    isDraggedOver={audioDragHandler.isDraggedOver}
                    placeholderRef={audioDragHandler.setRef}
                    size='xsmall'
                />
                <AudioUploadForm
                    fileInputRef={onFileInputRef}
                    filePicker={() => openFileSelection({fileInputRef: fileInputRef})}
                    mimeTypes={audioMimeTypes}
                    onFileChange={onFileChange}
                />
                <div className="absolute inset-0 z-50 mt-0"></div>
            </>
        );
    }
}

function AudioThumbnail({
    mimeTypes,
    src,
    progress,
    isUploading,
    isEditing,
    setFileInputRef,
    onFileChange,
    removeThumbnail,
    isDraggedOver,
    errors
}) {
    const fileInputRef = React.useRef(null);

    const onFileInputRef = (element) => {
        fileInputRef.current = element;
        setFileInputRef(fileInputRef);
    };

    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
    };

    if (isDraggedOver) {
        return (
            <div
                className="group relative flex aspect-square h-20 items-center justify-center rounded-sm bg-purple"
                data-testid="audio-thumbnail-dragover"
            >
                <p className="font-sans text-sm font-semibold text-white">
                    Drop it 🔥
                </p>
            </div>
        );
    } else if (errors && errors.length > 0) {
        return (
            <span className="group relative flex aspect-square h-20 items-center justify-center rounded-sm bg-grey-200 px-1 text-center font-sans text-xs font-semibold leading-snug text-red" data-testid="thumbnail-errors">
                {errors[0].message}
            </span>
        );
    } else if (src) {
        return (
            <div className="group relative flex aspect-square h-20 items-center justify-center rounded-sm bg-purple">
                <img alt="Audio thumbnail" className="h-full w-full rounded-sm object-cover transition ease-in" data-testid="audio-thumbnail" src={src} />
                {isEditing && (
                    <div className="absolute top-2 right-2 flex opacity-0 transition-all group-hover:opacity-100">
                        <IconButton dataTestID='remove-thumbnail' Icon={DeleteIcon} onClick={removeThumbnail} />
                    </div>
                )}
            </div>
        );
    } else if (isUploading) {
        return (
            <div className="group flex aspect-square h-20 items-center justify-center rounded-sm bg-purple">
                <ProgressBar bgStyle='transparent' style={progressStyle} />
            </div>
        );
    } else {
        return (
            <div className="group flex aspect-square h-20 items-center justify-center rounded-sm bg-purple">
                <button
                    className="flex h-20 w-20 items-center justify-center"
                    data-testid="upload-thumbnail"
                    type="button"
                    onClick={() => openFileSelection({fileInputRef: fileInputRef})}
                >
                    {(isEditing && <FilePlaceholderIcon className="ease-inx h-6 w-6 text-white transition-all duration-75 group-hover:scale-105" />) || <AudioFileIcon className="h-6 w-6 text-white" />}
                </button>
                <ImageUploadForm
                    disabled={!isEditing}
                    fileInputRef={onFileInputRef}
                    filePicker={() => openFileSelection({fileInputRef: fileInputRef})}
                    mimeTypes={mimeTypes}
                    onFileChange={onFileChange}
                />
            </div>
        );
    }
}

function PopulatedAudioCard({
    isEditing,
    title,
    placeholder,
    thumbnailUploader,
    thumbnailMimeTypes,
    duration,
    updateTitle,
    thumbnailSrc,
    setFileInputRef,
    onFileChange,
    removeThumbnail,
    thumbnailDragHandler = {}
}) {
    const {isLoading: isUploading, progress, errors} = thumbnailUploader;
    const formatDuration = (rawDuration) => {
        const minutes = Math.floor(rawDuration / 60);
        const seconds = Math.floor(rawDuration - (minutes * 60));
        const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
        const formattedDuration = `${minutes}:${returnedSeconds}`;
        return formattedDuration;
    };

    const handleChange = (event) => {
        updateTitle(event.target.value);
    };

    return (
        <div
            ref={thumbnailDragHandler.setRef}
            className="flex rounded border border-grey/30 p-2"
            data-testid="audio-card-populated"
        >
            <AudioThumbnail
                errors={errors}
                isDraggedOver={thumbnailDragHandler.isDraggedOver}
                isEditing={isEditing}
                isUploading={isUploading}
                mimeTypes={thumbnailMimeTypes}
                progress={progress}
                removeThumbnail={removeThumbnail}
                setFileInputRef={setFileInputRef}
                src={thumbnailSrc}
                onFileChange={onFileChange}
            />
            <div className="flex h-20 w-full flex-col justify-between px-4">
                {(isEditing || title) && (
                    <input
                        className="font-sans text-lg font-bold text-black"
                        data-testid="audio-caption"
                        name="title"
                        placeholder={placeholder}
                        readOnly={!isEditing}
                        value={title}
                        onChange={handleChange}
                    />
                )}
                <MediaPlayer duration={formatDuration(duration)} theme='dark' />
            </div>
        </div>
    );
}

export function AudioCard({
    src,
    thumbnailSrc,
    title,
    isEditing,
    updateTitle,
    duration,
    audioUploader,
    audioMimeTypes,
    thumbnailUploader,
    thumbnailMimeTypes,
    audioFileInputRef,
    thumbnailFileInputRef,
    onAudioFileChange,
    onThumbnailFileChange,
    audioDragHandler,
    removeThumbnail,
    thumbnailDragHandler
}) {
    const setAudioFileInputRef = (ref) => {
        if (audioFileInputRef) {
            audioFileInputRef.current = ref.current;
        }
    };

    const setThumbnailFileInputRef = (ref) => {
        if (thumbnailFileInputRef) {
            thumbnailFileInputRef.current = ref.current;
        }
    };

    if (src) {
        return (
            <div className="not-kg-prose">
                <PopulatedAudioCard
                    duration={duration}
                    isEditing={isEditing}
                    placeholder='Add a title...'
                    removeThumbnail={removeThumbnail}
                    setFileInputRef={setThumbnailFileInputRef}
                    setTitle={updateTitle}
                    thumbnailDragHandler={thumbnailDragHandler}
                    thumbnailMimeTypes={thumbnailMimeTypes}
                    thumbnailSrc={thumbnailSrc}
                    thumbnailUploader={thumbnailUploader}
                    title={title}
                    updateTitle={updateTitle}
                    onFileChange={onThumbnailFileChange}
                />
            </div>
        );
    } else {
        return (
            <div className="not-kg-prose">
                <EmptyAudioCard
                    audioDragHandler={audioDragHandler}
                    audioMimeTypes={audioMimeTypes}
                    audioUploader={audioUploader}
                    setFileInputRef={setAudioFileInputRef}
                    onFileChange={onAudioFileChange}
                />
            </div>
        );
    }
}

AudioCard.propTypes = {
    src: PropTypes.string,
    title: PropTypes.string
};
