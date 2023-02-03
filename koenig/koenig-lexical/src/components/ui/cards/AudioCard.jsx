import React from 'react';
import PropTypes from 'prop-types';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {MediaPlayer} from '../MediaPlayer';
import {ProgressBar} from '../ProgressBar';
import {ReactComponent as AudioFileIcon} from '../../../assets/icons/kg-audio-file.svg';
import {ReactComponent as TrashIcon} from '../../../assets/icons/kg-trash.svg';
import {openFileSelection} from '../../../utils/openFileSelection';
import {ReactComponent as FilePlaceholderIcon} from '../../../assets/icons/kg-file-placeholder.svg';
import {AudioUploadForm} from '../AudioUploadForm';
import {ImageUploadForm} from '../ImageUploadForm';

function AudioUploading({progress}) {
    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
    };

    return (
        <div className="flex rounded border border-grey/30 p-2">
            <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50">
                <ProgressBar style={progressStyle} />
            </div>
        </div>
    );
}

function AudioErrors({errors}) {
    return (
        <span className="h8 pl2 pr2 red sans-serif f6 fw5 flex items-center" data-testid="audio-upload-errors">
            {errors[0].message}
        </span>
    );
}

function EmptyAudioCard({
    audioUploader,
    onFileChange,
    setFileInputRef,
    handleDrag,
    handleDrop,
    isDraggedOver
}) {
    const {isLoading: isUploading, progress, errors} = audioUploader;
    const fileInputRef = React.useRef(null);

    const onFileInputRef = (element) => {
        fileInputRef.current = element;
        setFileInputRef(fileInputRef);
    };

    if (isUploading) {
        return (<AudioUploading progress={progress} />);
    } else if (errors && errors.length > 0) {
        return (<AudioErrors errors={errors} />);
    } else {
        return (
            <>
                <MediaPlaceholder
                    handleDrag={handleDrag}
                    handleDrop={handleDrop}
                    isDraggedOver={isDraggedOver}
                    filePicker={() => openFileSelection({fileInputRef: fileInputRef})}
                    desc='Click to upload an audio file'
                    icon='audio'
                    size='xsmall'
                />
                <AudioUploadForm
                    filePicker={() => openFileSelection({fileInputRef: fileInputRef})}
                    onFileChange={onFileChange}
                    fileInputRef={onFileInputRef}
                />
            </>
        );
    }
}

function AudioThumbnail({
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
    const [showTrash, setShowTrash] = React.useState(false);

    const fileInputRef = React.useRef(null);

    const onFileInputRef = (element) => {
        fileInputRef.current = element;
        setFileInputRef(fileInputRef);
    };

    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
    };

    // Show the trash icon on mouseover
    const onMouseOver = (event) => {
        setShowTrash(true);
    };

    // Hide the trash icon on mouseout
    const onMouseOut = (event) => {
        setShowTrash(false);
    };

    if (isDraggedOver) { 
        return (
            <div className="group relative flex aspect-square h-20 items-center justify-center rounded-sm bg-purple">
                <span class="fw6 f7 white lh-1">
                    Drop it 🔥
                </span>
            </div>
        );
    } else if (errors && errors.length > 0) {
        return (
            <span className="db h8 pl2 pr2 red sans-serif f6 fw6 flex items-center" data-testid="thumbnail-errors">
                {errors[0].message}
            </span>
        );
    } else if (src) {
        return (
            <div className="group relative flex aspect-square h-20 items-center justify-center rounded-sm bg-purple">
                <img data-testid="audio-thumbnail" src={src} alt="Audio thumbnail" className="h-full w-full object-cover transition ease-in" />
                <div className={`absolute inset-0 p-2 ${showTrash ? 'opacity-100' : 'opacity-0'} transition ease-in-out`} onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
                    <div className="flex flex-row-reverse">
                        <button onClick={removeThumbnail} data-testid="remove-thumbnail" className="br3 pe-auto bg-white opacity-90" type="button">
                            <TrashIcon className="h-6 w-6 fill-[#394047] transition-all duration-75" />
                        </button>
                    </div>
                </div>
            </div>
        );
    } else if (isUploading) {
        return (
            <div className="group flex aspect-square h-20 items-center justify-center rounded-sm bg-purple">
                <ProgressBar style={progressStyle} />
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
    duration,
    updateTitle,
    thumbnailSrc,
    setFileInputRef,
    onFileChange,
    removeThumbnail,
    handleDrag,
    handleDrop,
    isDraggedOver
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
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <AudioThumbnail
                progress={progress}
                isUploading={isUploading}
                src={thumbnailSrc} 
                isEditing={isEditing} 
                onFileChange={onFileChange} 
                setFileInputRef={setFileInputRef}
                removeThumbnail={removeThumbnail}
                isDraggedOver={isDraggedOver}
                errors={errors}
            />
            <div className="flex h-20 w-full flex-col justify-between px-4">
                {(isEditing || title) && <input value={title} onChange={handleChange} placeholder={placeholder} name="title" className="font-sans text-lg font-bold text-black" />}
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
    titlePlaceholder,
    duration,
    audioUploader,
    thumbnailUploader,
    audioFileInputRef,
    thumbnailFileInputRef,
    onAudioFileChange,
    onThumbnailFileChange,
    handleAudioDrag,
    handleAudioDrop,
    handleThumbnailDrag,
    handleThumbnailDrop,
    isDraggedOver,
    removeThumbnail
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
                    placeholder={titlePlaceholder}
                    duration={duration}
                    thumbnailUploader={thumbnailUploader}
                    setTitle={updateTitle}
                    isEditing={isEditing}
                    updateTitle={updateTitle}
                    thumbnailSrc={thumbnailSrc}
                    setFileInputRef={setThumbnailFileInputRef}
                    onFileChange={onThumbnailFileChange}
                    removeThumbnail={removeThumbnail}
                    isDraggedOver={isDraggedOver}
                    handleDrag={handleThumbnailDrag}
                    handleDrop={handleThumbnailDrop}
                />
            </div>
        );
    } else {
        return (
            <div className="not-kg-prose">
                <EmptyAudioCard
                    setFileInputRef={setAudioFileInputRef}
                    onFileChange={onAudioFileChange}
                    handleDrag={handleAudioDrag}
                    handleDrop={handleAudioDrop}
                    isDraggedOver={isDraggedOver}
                    audioUploader={audioUploader}
                />
            </div>
        );
    }
}

AudioCard.propTypes = {
    src: PropTypes.string,
    thumbnailSrc: PropTypes.string,
    title: PropTypes.string,
    isEditing: PropTypes.bool,
    updateTitle: PropTypes.func,
    titlePlaceholder: PropTypes.string,
    duration: PropTypes.number,
    audioUploader: PropTypes.shape({
        isUploading: PropTypes.bool,
        progress: PropTypes.number,
        errors: PropTypes.arrayOf(PropTypes.object),
        upload: PropTypes.func,
        filesNumber: PropTypes.number
    }),
    thumbnailUploader: PropTypes.shape({
        isUploading: PropTypes.bool,
        progress: PropTypes.number,
        errors: PropTypes.arrayOf(PropTypes.object),
        upload: PropTypes.func,
        filesNumber: PropTypes.number
    }),
    audioFileInputRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}),
    thumbnailFileInputRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}),
    onAudioFileChange: PropTypes.func,
    onThumbnailFileChange: PropTypes.func,
    handleAudioDrag: PropTypes.func,
    handleAudioDrop: PropTypes.func,
    handleThumbnailDrag: PropTypes.func,
    handleThumbnailDrop: PropTypes.func,
    isDraggedOver: PropTypes.bool,
    removeThumbnail: PropTypes.func
};

EmptyAudioCard.propTypes = {
    onFileChange: PropTypes.func,
    setFileInputRef: PropTypes.func,
    handleDrag: PropTypes.func,
    handleDrop: PropTypes.func,
    isDraggedOver: PropTypes.bool,
    audioUploader: PropTypes.shape({
        isUploading: PropTypes.bool,
        progress: PropTypes.number,
        errors: PropTypes.arrayOf(PropTypes.object),
        upload: PropTypes.func,
        filesNumber: PropTypes.number
    })
};

AudioThumbnail.propTypes = {
    src: PropTypes.string,
    progress: PropTypes.number,
    isUploading: PropTypes.bool,
    isEditing: PropTypes.bool,
    onFileChange: PropTypes.func,
    setFileInputRef: PropTypes.func,
    removeThumbnail: PropTypes.func,
    isDraggedOver: PropTypes.bool
};

PopulatedAudioCard.propTypes = {
    title: PropTypes.string,
    placeholder: PropTypes.string,
    duration: PropTypes.number,
    thumbnailUploader: PropTypes.shape({
        isUploading: PropTypes.bool,
        progress: PropTypes.number,
        errors: PropTypes.arrayOf(PropTypes.object),
        upload: PropTypes.func,
        filesNumber: PropTypes.number
    }),
    updateTitle: PropTypes.func,
    isEditing: PropTypes.bool,
    thumbnailSrc: PropTypes.string,
    setFileInputRef: PropTypes.func,
    onFileChange: PropTypes.func,
    removeThumbnail: PropTypes.func,
    handleDrag: PropTypes.func,
    handleDrop: PropTypes.func,
    isDraggedOver: PropTypes.bool
};

AudioUploading.propTypes = {
    progress: PropTypes.number
};

AudioErrors.propTypes = {
    errors: PropTypes.arrayOf(PropTypes.object)
};