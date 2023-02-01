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

function EmptyAudioCard({
    onAudioFileChange,
    setAudioFileInputRef,
    handleDrag,
    handleDrop,
    isDraggedOver
}) {
    const audioFileInputRef = React.useRef(null);

    const onAudioFileInputRef = (element) => {
        audioFileInputRef.current = element;
        setAudioFileInputRef(audioFileInputRef);
    };

    return (
        <div className="not-kg-prose">
            <MediaPlaceholder
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                isDraggedOver={isDraggedOver}
                filePicker={() => openFileSelection({fileInputRef: audioFileInputRef})}
                desc='Click to upload an audio file'
                icon='audio'
                size='xsmall'
            />
            <AudioUploadForm
                filePicker={() => openFileSelection({fileInputRef: audioFileInputRef})}
                onFileChange={onAudioFileChange}
                fileInputRef={onAudioFileInputRef}
            />
        </div>
    );
}

function AudioThumbnail({
    thumbnailSrc,
    thumbnailProgress,
    isUploadingThumbnail,
    isEditing,
    setThumbnailFileInputRef,
    onThumbnailFileChange,
    removeThumbnail
}) {
    const [showTrash, setShowTrash] = React.useState(false);

    const thumbnailFileInputRef = React.useRef(null);

    const onThumbnailFileInputRef = (element) => {
        thumbnailFileInputRef.current = element;
        setThumbnailFileInputRef(thumbnailFileInputRef);
    };

    const progressStyle = {
        width: `${thumbnailProgress?.toFixed(0)}%`
    };

    // Show the trash icon on mouseover
    const onMouseOver = (event) => {
        setShowTrash(true);
    };

    // Hide the trash icon on mouseout
    const onMouseOut = (event) => {
        setShowTrash(false);
    };

    if (thumbnailSrc) {
        return (
            <div className="group relative flex aspect-square h-20 items-center justify-center rounded-sm bg-purple">
                <img data-testid="audio-thumbnail" src={thumbnailSrc} alt="Audio thumbnail" className="h-full w-full object-cover transition ease-in" />
                <div className={`absolute inset-0 p-2 ${showTrash ? 'opacity-100' : 'opacity-0'} transition ease-in-out`} onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
                    <div className="flex flex-row-reverse">
                        <button onClick={removeThumbnail} data-testid="remove-thumbnail" className="br3 pe-auto bg-white opacity-90" type="button">
                            <TrashIcon className="h-6 w-6 fill-[#394047] transition-all duration-75" />
                        </button>
                    </div>
                </div>
            </div>
        );
    } else if (isUploadingThumbnail) {
        return (
            <div className="group flex aspect-square h-20 items-center justify-center rounded-sm bg-purple">
                <ProgressBar style={progressStyle} />
            </div>
        );
    } else {
        return (
            <div className="group flex h-20 w-20 items-center justify-center rounded-sm bg-purple">
                <button
                    data-testid="upload-thumbnail"
                    type="button" 
                    onClick={() => openFileSelection({fileInputRef: thumbnailFileInputRef})}
                    className="flex h-20 w-20 items-center justify-center"
                >
                    {(isEditing && <FilePlaceholderIcon className="ease-inx h-6 w-6 text-white transition-all duration-75 group-hover:scale-105" />) || <AudioFileIcon className="h-6 w-6 text-white" />}
                </button>
                <ImageUploadForm
                    filePicker={() => openFileSelection({fileInputRef: thumbnailFileInputRef})}
                    onFileChange={onThumbnailFileChange}
                    fileInputRef={onThumbnailFileInputRef}
                />
            </div>
        );
    }
}

function PopulatedAudioCard({
    isEditing,
    title,
    placeholder,
    audioProgress,
    isUploadingAudio,
    isUploadingThumbnail,
    thumbnailProgress,
    duration,
    updateTitle,
    thumbnailSrc,
    setThumbnailFileInputRef,
    onThumbnailFileChange,
    removeThumbnail
}) {
    const progressStyle = {
        width: `${audioProgress?.toFixed(0)}%`
    };

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

    if (isUploadingAudio) {
        return (
            <div className="not-kg-prose">
                <div className="flex rounded border border-grey/30 p-2">
                    <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50">
                        <ProgressBar data-testid="progress-bar" style={progressStyle} />
                    </div>
                </div>
            </div>
        );
    } else {
        return (
            <div className="not-kg-prose">
                <div className="flex rounded border border-grey/30 p-2">
                    <AudioThumbnail
                        thumbnailProgress={thumbnailProgress}
                        isUploadingThumbnail={isUploadingThumbnail}
                        thumbnailSrc={thumbnailSrc} 
                        isEditing={isEditing} 
                        onThumbnailFileChange={onThumbnailFileChange} 
                        setThumbnailFileInputRef={setThumbnailFileInputRef}
                        removeThumbnail={removeThumbnail}
                    />
                    <div className="flex h-20 w-full flex-col justify-between px-4">
                        {(isEditing || title) && <input value={title} onChange={handleChange} placeholder={placeholder} name="title" className="font-sans text-lg font-bold text-black" />}
                        <MediaPlayer duration={formatDuration(duration)} theme='dark' />
                    </div>
                </div>
            </div>
            
        );
    }
}

export function AudioCard({
    src,
    title,
    isEditing,
    updateTitle,
    titlePlaceholder,
    thumbnailSrc,
    duration,
    audioProgress,
    isUploadingAudio,
    thumbnailProgress,
    isUploadingThumbnail,
    audioFileInputRef,
    thumbnailFileInputRef,
    onAudioFileChange,
    onThumbnailFileChange,
    handleDrag,
    handleDrop,
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

    if (isUploadingAudio || src) {
        return (
            <PopulatedAudioCard
                title={title}
                placeholder={titlePlaceholder}
                duration={duration}
                audioProgress={audioProgress}
                isUploadingAudio={isUploadingAudio}
                isUploadingThumbnail={isUploadingThumbnail}
                thumbnailProgress={thumbnailProgress}
                setTitle={updateTitle}
                isEditing={isEditing}
                updateTitle={updateTitle}
                thumbnailSrc={thumbnailSrc}
                setThumbnailFileInputRef={setThumbnailFileInputRef}
                onThumbnailFileChange={onThumbnailFileChange}
                removeThumbnail={removeThumbnail}
            />
        );
    }
    return (
        <EmptyAudioCard
            setAudioFileInputRef={setAudioFileInputRef}
            onAudioFileChange={onAudioFileChange}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            isDraggedOver={isDraggedOver}
        />
    );
}

AudioCard.propTypes = {
    src: PropTypes.string,
    title: PropTypes.string,
    isEditing: PropTypes.bool,
    updateTitle: PropTypes.func,
    titlePlaceholder: PropTypes.string,
    thumbnailSrc: PropTypes.string,
    duration: PropTypes.number,
    audioProgress: PropTypes.number,
    isUploadingAudio: PropTypes.bool,
    isUploadingThumbnail: PropTypes.bool,
    thumbnailProgress: PropTypes.number,
    audioFileInputRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}),
    thumbnailFileInputRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}),
    onAudioFileChange: PropTypes.func,
    onThumbnailFileChange: PropTypes.func,
    handleDrag: PropTypes.func,
    handleDrop: PropTypes.func,
    isDraggedOver: PropTypes.bool,
    removeThumbnail: PropTypes.func
};

EmptyAudioCard.propTypes = {
    onAudioFileChange: PropTypes.func,
    setAudioFileInputRef: PropTypes.func,
    handleDrag: PropTypes.func,
    handleDrop: PropTypes.func,
    isDraggedOver: PropTypes.bool
};

AudioThumbnail.propTypes = {
    thumbnailSrc: PropTypes.string,
    thumbnailProgress: PropTypes.number,
    isUploadingThumbnail: PropTypes.bool,
    isEditing: PropTypes.bool,
    onThumbnailFileChange: PropTypes.func,
    setThumbnailFileInputRef: PropTypes.func,
    removeThumbnail: PropTypes.func
};

PopulatedAudioCard.propTypes = {
    title: PropTypes.string,
    placeholder: PropTypes.string,
    duration: PropTypes.number,
    audioProgress: PropTypes.number,
    thumbnailProgress: PropTypes.number,
    isUploadingAudio: PropTypes.bool,
    isUploadingThumbnail: PropTypes.bool,
    updateTitle: PropTypes.func,
    isEditing: PropTypes.bool,
    thumbnailSrc: PropTypes.string,
    setThumbnailFileInputRef: PropTypes.func,
    onThumbnailFileChange: PropTypes.func,
    removeThumbnail: PropTypes.func
};