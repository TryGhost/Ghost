import React from 'react';
import PropTypes from 'prop-types';
import {IconButton} from '../IconButton';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {MediaPlayer} from '../MediaPlayer';
import {ProgressBar} from '../ProgressBar';
import {ReactComponent as AudioFileIcon} from '../../../assets/icons/kg-audio-file.svg';
import {ReactComponent as DeleteIcon} from '../../../assets/icons/kg-trash.svg';
import {openFileSelection} from '../../../utils/openFileSelection';
import {ReactComponent as FilePlaceholderIcon} from '../../../assets/icons/kg-file-placeholder.svg';
import {AudioUploadForm} from '../AudioUploadForm';
import {ImageUploadForm} from '../ImageUploadForm';

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
    audioDragHandler
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
                    placeholderRef={audioDragHandler.setRef}
                    isDraggedOver={audioDragHandler.isDraggedOver}
                    filePicker={() => openFileSelection({fileInputRef: fileInputRef})}
                    desc='Click to upload an audio file'
                    icon='audio'
                    size='xsmall'
                    errors={errors}
                    errorDataTestId="audio-upload-errors"
                />
                <AudioUploadForm
                    filePicker={() => openFileSelection({fileInputRef: fileInputRef})}
                    onFileChange={onFileChange}
                    fileInputRef={onFileInputRef}
                    mimeTypes={audioMimeTypes}
                />
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
                <img data-testid="audio-thumbnail" src={src} alt="Audio thumbnail" className="h-full w-full rounded-sm object-cover transition ease-in" />
                {isEditing && (
                    <div className="absolute top-2 right-2 flex opacity-0 transition-all group-hover:opacity-100">
                        <IconButton onClick={removeThumbnail} Icon={DeleteIcon} dataTestID='remove-thumbnail' />
                    </div>
                )}
            </div>
        );
    } else if (isUploading) {
        return (
            <div className="group flex aspect-square h-20 items-center justify-center rounded-sm bg-purple">
                <ProgressBar style={progressStyle} bgStyle='transparent' />
            </div>
        );
    } else {
        return (
            <div className="group flex aspect-square h-20 items-center justify-center rounded-sm bg-purple">
                <button
                    data-testid="upload-thumbnail"
                    type="button"
                    onClick={() => openFileSelection({fileInputRef: fileInputRef})}
                    className="flex h-20 w-20 items-center justify-center"
                >
                    {(isEditing && <FilePlaceholderIcon className="ease-inx h-6 w-6 text-white transition-all duration-75 group-hover:scale-105" />) || <AudioFileIcon className="h-6 w-6 text-white" />}
                </button>
                <ImageUploadForm
                    filePicker={() => openFileSelection({fileInputRef: fileInputRef})}
                    onFileChange={onFileChange}
                    fileInputRef={onFileInputRef}
                    mimeTypes={mimeTypes}
                    disabled={!isEditing}
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
    thumbnailDragHandler
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
            className="flex rounded border border-grey/30 p-2"
            data-testid="audio-card-populated"
            ref={thumbnailDragHandler.setRef}
        >
            <AudioThumbnail
                mimeTypes={thumbnailMimeTypes}
                progress={progress}
                isUploading={isUploading}
                src={thumbnailSrc}
                isEditing={isEditing}
                onFileChange={onFileChange}
                setFileInputRef={setFileInputRef}
                removeThumbnail={removeThumbnail}
                isDraggedOver={thumbnailDragHandler.isDraggedOver}
                errors={errors}
            />
            <div className="flex h-20 w-full flex-col justify-between px-4">
                {(isEditing || title) && (
                    <input
                        value={title}
                        readOnly={!isEditing}
                        onChange={handleChange}
                        placeholder={placeholder}
                        name="title"
                        className="font-sans text-lg font-bold text-black"
                        data-testid="audio-caption"
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
                    title={title}
                    placeholder='Add a title...'
                    duration={duration}
                    thumbnailUploader={thumbnailUploader}
                    thumbnailMimeTypes={thumbnailMimeTypes}
                    setTitle={updateTitle}
                    isEditing={isEditing}
                    updateTitle={updateTitle}
                    thumbnailSrc={thumbnailSrc}
                    setFileInputRef={setThumbnailFileInputRef}
                    onFileChange={onThumbnailFileChange}
                    removeThumbnail={removeThumbnail}
                    thumbnailDragHandler={thumbnailDragHandler}
                />
            </div>
        );
    } else {
        return (
            <div className="not-kg-prose">
                <EmptyAudioCard
                    setFileInputRef={setAudioFileInputRef}
                    onFileChange={onAudioFileChange}
                    audioDragHandler={audioDragHandler}
                    audioUploader={audioUploader}
                    audioMimeTypes={audioMimeTypes}
                />
            </div>
        );
    }
}

AudioCard.propTypes = {
    src: PropTypes.string,
    title: PropTypes.string
};
