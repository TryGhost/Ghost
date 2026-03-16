import DeleteIcon from '../../assets/icons/kg-trash.svg?react';
import ImageUploadForm from './ImageUploadForm';
import React from 'react';
import WandIcon from '../../assets/icons/kg-wand.svg?react';
import clsx from 'clsx';
import {IconButton} from './IconButton';
import {MediaPlaceholder} from './MediaPlaceholder';
import {ProgressBar} from './ProgressBar';
import {createFileInputChangeEventFromBlob} from '../../utils/createFileInputChangeEvent';
import {openFileSelection} from '../../utils/openFileSelection';
import {useRef} from 'react';
import type {OpenImageEditor} from '../../hooks/usePinturaEditor';

interface MediaUploaderProps {
    className?: string;
    imgClassName?: string;
    src?: string;
    alt?: string;
    desc?: string;
    icon?: string;
    size?: string;
    type?: 'image' | 'button';
    borderStyle?: 'squared' | 'rounded';
    backgroundSize?: 'cover' | 'contain';
    mimeTypes?: string[];
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    dragHandler?: {isDraggedOver?: boolean; setRef?: React.Ref<HTMLDivElement>};
    isEditing?: boolean;
    isLoading?: boolean;
    isPinturaEnabled?: boolean;
    openImageEditor?: OpenImageEditor;
    progress?: number;
    errors?: {message: string}[];
    onRemoveMedia?: () => void;
    additionalActions?: React.ReactNode;
    setFileInputRef?: (el: HTMLInputElement | null) => void;
}

export function MediaUploader({
    className,
    imgClassName,
    src,
    alt,
    desc,
    icon,
    size,
    type,
    borderStyle = 'squared',
    backgroundSize = 'cover',
    mimeTypes,
    onFileChange,
    dragHandler,
    isEditing = true,
    isLoading,
    isPinturaEnabled,
    openImageEditor,
    progress,
    errors,
    onRemoveMedia = () => {},
    additionalActions,
    setFileInputRef
}: MediaUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const onFileInputRef = (element: HTMLInputElement | null) => {
        fileInputRef.current = element;
        setFileInputRef?.(element);
    };

    const progressStyle = {
        width: `${(progress ?? 0).toFixed(0)}%`
    };

    const onRemove = (e: React.MouseEvent) => {
        e.stopPropagation(); // prevents card from losing selected state
        onRemoveMedia();
    };

    const isEmpty = !isLoading && !src;

    if (isEmpty) {
        return (
            <div className={className}>
                <MediaPlaceholder
                    borderStyle={borderStyle}
                    dataTestId="media-upload-placeholder"
                    desc={isEditing ? desc : ''}
                    errorDataTestId="media-upload-errors"
                    errors={errors}
                    filePicker={() => openFileSelection({fileInputRef})}
                    icon={icon as 'image' | 'gallery' | 'video' | 'audio' | 'file' | 'product'}
                    isDraggedOver={dragHandler?.isDraggedOver}
                    placeholderRef={dragHandler?.setRef}
                    size={size as 'xsmall' | 'small' | 'medium' | 'large'}
                    type={type}
                />
                <ImageUploadForm
                    fileInputRef={onFileInputRef}
                    mimeTypes={mimeTypes}
                    onFileChange={onFileChange}
                />
            </div>
        );
    }

    return (
        <div className={clsx(
            'group/image relative flex items-center justify-center',
            isLoading ? 'min-w-[6.8rem]' : 'min-w-[5.2rem]',
            borderStyle === 'rounded' && 'rounded',
            className
        )} data-testid="media-upload-filled">
            {src && (
                <>
                    <img alt={alt} className={clsx('mx-auto h-full w-auto min-w-[5.2rem]', borderStyle === 'rounded' && 'rounded-lg', backgroundSize === 'cover' ? 'object-cover' : 'object-contain', imgClassName)} src={src} />
                    <div className={clsx('absolute inset-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 opacity-0 transition-all group-hover/image:opacity-100', borderStyle === 'rounded' && 'rounded-lg')}></div>
                </>
            )}

            {!isLoading && (
                <div className="absolute right-1 top-1 flex space-x-1 opacity-0 transition-all group-hover/image:opacity-100">
                    {additionalActions}
                    { isPinturaEnabled && <IconButton Icon={WandIcon} label="Edit" onClick={() => openImageEditor?.({
                        image: src || '',
                        handleSave: (editedImage: Blob) => {
                            onFileChange(createFileInputChangeEventFromBlob(editedImage));
                        }
                    })} /> }
                    <IconButton dataTestId="media-upload-remove" Icon={DeleteIcon} label="Delete" onClick={onRemove} />
                </div>
            )}

            {isLoading && (
                <div
                    className={clsx('absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-grey-100', borderStyle === 'rounded' && 'rounded-lg')}
                    data-testid="custom-thumbnail-progress"
                >
                    <ProgressBar style={progressStyle} />
                </div>
            )}
        </div>
    );
}
