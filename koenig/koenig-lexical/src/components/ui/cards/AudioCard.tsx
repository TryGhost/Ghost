import AudioFileIcon from '../../../assets/icons/kg-audio-file.svg?react';
import DeleteIcon from '../../../assets/icons/kg-trash.svg?react';
import FilePlaceholderIcon from '../../../assets/icons/kg-file-placeholder.svg?react';
import React from 'react';
import {AudioUploadForm} from '../AudioUploadForm';
import {IconButton} from '../IconButton';
import {ImageUploadForm} from '../ImageUploadForm';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {MediaPlayer} from '../MediaPlayer';
import {ProgressBar} from '../ProgressBar';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';
import {TextInput} from '../TextInput';
import {openFileSelection} from '../../../utils/openFileSelection';

interface FileUploader {
    isLoading?: boolean;
    progress?: number;
    errors?: {message: string}[];
}

interface DragHandler {
    isDraggedOver?: boolean;
    setRef?: React.Ref<HTMLDivElement>;
}

function AudioUploading({progress}: {progress?: number}) {
    const progressStyle = {
        width: `${(progress ?? 0).toFixed(0)}%`
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

interface EmptyAudioCardProps {
    audioUploader: FileUploader;
    audioMimeTypes?: string[];
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setFileInputRef: (ref: React.RefObject<HTMLInputElement | null>) => void;
    audioDragHandler?: DragHandler;
}

function EmptyAudioCard({
    audioUploader,
    audioMimeTypes,
    onFileChange,
    setFileInputRef,
    audioDragHandler = {}
}: EmptyAudioCardProps) {
    const {isLoading: isUploading, progress, errors} = audioUploader;
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const onFileInputRef = (element: HTMLInputElement | null) => {
        (fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
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
                    onFileChange={onFileChange!}
                />
            </>
        );
    }
}

interface AudioThumbnailProps {
    mimeTypes?: string[];
    src?: string;
    progress?: number;
    isUploading?: boolean;
    isEditing?: boolean;
    setFileInputRef: (ref: React.RefObject<HTMLInputElement | null>) => void;
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeThumbnail?: () => void;
    isDraggedOver?: boolean;
    errors?: {message: string}[];
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
}: AudioThumbnailProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const onFileInputRef = (element: HTMLInputElement | null) => {
        (fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
        setFileInputRef(fileInputRef);
    };

    const progressStyle = {
        width: `${(progress ?? 0).toFixed(0)}%`
    };

    if (isDraggedOver) {
        return (
            <div
                className="group relative flex aspect-square h-20 items-center justify-center rounded-md bg-purple"
                data-testid="audio-thumbnail-dragover"
            >
                <p className="font-sans text-sm font-semibold text-white">
                    Drop it 🔥
                </p>
            </div>
        );
    } else if (errors && errors.length > 0) {
        return (
            <span className="group relative flex aspect-square h-20 items-center justify-center rounded-md bg-grey-200 px-1 text-center font-sans text-2xs font-semibold leading-snug text-red" data-testid="thumbnail-errors">
                {errors[0].message}
            </span>
        );
    } else if (src) {
        return (
            <div className="group/image relative flex aspect-square h-20 items-center justify-center rounded-md bg-purple">
                <img alt="Audio thumbnail" className="size-full rounded-md object-cover transition ease-in" data-testid="audio-thumbnail" src={src} />
                {isEditing && (
                    <div className="absolute right-2 top-2 flex opacity-0 transition-all group-hover/image:opacity-100">
                        <IconButton dataTestId='remove-thumbnail' Icon={DeleteIcon} label="Delete" onClick={removeThumbnail} />
                    </div>
                )}
            </div>
        );
    } else if (isUploading) {
        return (
            <div className="group flex aspect-square h-20 items-center justify-center rounded-md bg-purple">
                <ProgressBar bgStyle='transparent' style={progressStyle} />
            </div>
        );
    } else {
        return (
            <div className="group flex aspect-square h-20 items-center justify-center rounded-md bg-purple">
                <button
                    className="flex size-20 cursor-pointer items-center justify-center"
                    data-testid="upload-thumbnail"
                    type="button"
                    onClick={() => openFileSelection({fileInputRef: fileInputRef})}
                >
                    {(isEditing && <FilePlaceholderIcon className="ease-inx size-6 text-white transition-all duration-75 group-hover:scale-105" />) || <AudioFileIcon className="size-6 text-white" />}
                </button>
                <ImageUploadForm
                    disabled={!isEditing}
                    fileInputRef={onFileInputRef}
                    filePicker={() => openFileSelection({fileInputRef: fileInputRef})}
                    mimeTypes={mimeTypes}
                    onFileChange={onFileChange!}
                />
            </div>
        );
    }
}

interface PopulatedAudioCardProps {
    isEditing?: boolean;
    title?: string;
    placeholder?: string;
    thumbnailUploader: FileUploader;
    thumbnailMimeTypes?: string[];
    duration?: number;
    updateTitle?: (value: string) => void;
    thumbnailSrc?: string;
    setFileInputRef: (ref: React.RefObject<HTMLInputElement | null>) => void;
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeThumbnail?: () => void;
    thumbnailDragHandler?: DragHandler;
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
}: PopulatedAudioCardProps) {
    const {isLoading: isUploading, progress, errors} = thumbnailUploader;
    const formatDuration = (rawDuration: number) => {
        const minutes = Math.floor(rawDuration / 60);
        const seconds = Math.floor(rawDuration - (minutes * 60));
        const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
        const formattedDuration = `${minutes}:${returnedSeconds}`;
        return formattedDuration;
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateTitle?.(event.target.value);
    };

    return (
        <>
            <div
                ref={thumbnailDragHandler.setRef as React.Ref<HTMLDivElement>}
                className="flex rounded-md border border-grey/30 p-2"
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
                        <TextInput
                            className="bg-transparent font-sans text-lg font-bold text-current"
                            data-testid="audio-title"
                            name="title"
                            placeholder={placeholder}
                            readOnly={!isEditing}
                            value={title}
                            onChange={handleChange}
                        />
                    )}
                    <MediaPlayer duration={formatDuration(duration || 0)} theme='dark' />
                </div>
            </div>
            {!isEditing && <ReadOnlyOverlay />}
        </>
    );
}

interface AudioCardProps {
    src?: string;
    thumbnailSrc?: string;
    title?: string;
    isEditing?: boolean;
    updateTitle?: (value: string) => void;
    duration?: number;
    audioUploader: FileUploader;
    audioMimeTypes?: string[];
    thumbnailUploader: FileUploader;
    thumbnailMimeTypes?: string[];
    audioFileInputRef?: React.MutableRefObject<HTMLInputElement | null>;
    thumbnailFileInputRef?: React.MutableRefObject<HTMLInputElement | null>;
    onAudioFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onThumbnailFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    audioDragHandler?: DragHandler;
    removeThumbnail?: () => void;
    thumbnailDragHandler?: DragHandler;
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
}: AudioCardProps) {
    const setAudioFileInputRef = (ref: React.RefObject<HTMLInputElement | null>) => {
        if (audioFileInputRef) {
            audioFileInputRef.current = ref.current;
        }
    };

    const setThumbnailFileInputRef = (ref: React.RefObject<HTMLInputElement | null>) => {
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
