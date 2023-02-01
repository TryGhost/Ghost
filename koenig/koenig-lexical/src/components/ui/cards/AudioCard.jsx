import React from 'react';
import PropTypes from 'prop-types';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {MediaPlayer} from '../MediaPlayer';
import {ProgressBar} from '../ProgressBar';
import {ReactComponent as AudioFileIcon} from '../../../assets/icons/kg-audio-file.svg';
import {ReactComponent as ReplaceThumbnailIcon} from '../../../assets/icons/kg-replace.svg';
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
    isEditing,
    setThumbnailFileInputRef,
    onThumbnailFileChange,
    removeThumbnail
}) {
    const thumbnailFileInputRef = React.useRef(null);

    const onThumbnailFileInputRef = (element) => {
        thumbnailFileInputRef.current = element;
        setThumbnailFileInputRef(thumbnailFileInputRef);
    };

    const progressStyle = {
        width: `${thumbnailProgress?.toFixed(0)}%`
    };

    if (thumbnailSrc) {
        return (
            <div className="group flex h-20 w-20 items-center justify-center rounded-sm bg-purple">
                <img data-testid="audio-thumbnail" src={thumbnailSrc} alt="Audio thumbnail" />
                <div className="insert-0 absolute p-2">
                    <div className="flex flex-row-reverse">
                        <button onClick={removeThumbnail} data-testid="remove-thumbnail" className="bg-white-90 br3 pe-auto" type="button">
                            <ReplaceThumbnailIcon className="h-6 w-6 text-white transition-all duration-75" />
                        </button>
                    </div>
                </div>
            </div>
        );
    } else if (thumbnailProgress) {
        return (
            <div className="group flex h-20 w-20 items-center justify-center rounded-sm bg-purple">
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

    if (audioProgress) {
        return (
            <div className="not-kg-prose">
                <div className="flex rounded border border-grey/30 p-2">
                    <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50">
                        <ProgressBar style={progressStyle} />
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
    thumbnailProgress,
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

    if (audioProgress || src) {
        return (
            <PopulatedAudioCard
                title={title}
                placeholder={titlePlaceholder}
                duration={duration}
                audioProgress={audioProgress}
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
    updateTitle: PropTypes.func,
    isEditing: PropTypes.bool,
    thumbnailSrc: PropTypes.string,
    setThumbnailFileInputRef: PropTypes.func,
    onThumbnailFileChange: PropTypes.func,
    removeThumbnail: PropTypes.func
};