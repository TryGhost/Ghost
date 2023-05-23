import ImageUploadForm from './ImageUploadForm';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {ReactComponent as DeleteIcon} from '../../assets/icons/kg-trash.svg';
import {ReactComponent as EditIcon} from '../../assets/icons/kg-edit.svg';
import {IconButton} from './IconButton';
import {MediaPlaceholder} from './MediaPlaceholder';
import {ProgressBar} from './ProgressBar';
import {openFileSelection} from '../../utils/openFileSelection';
import {useRef} from 'react';

export function MediaUploader({
    className,
    src,
    alt,
    desc,
    icon,
    size,
    borderStyle = 'border-transparent',
    mimeTypes,
    onFileChange,
    dragHandler,
    isLoading,
    isPinturaEnabled,
    openImageEditor,
    progress,
    errors,
    onRemoveMedia,
    additionalActions
}) {
    const fileInputRef = useRef(null);

    const onFileInputRef = (element) => {
        fileInputRef.current = element;
    };

    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
    };

    const onRemove = (e) => {
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
                    desc={desc}
                    errorDataTestId="media-upload-errors"
                    errors={errors}
                    filePicker={() => openFileSelection({fileInputRef})}
                    icon={icon}
                    isDraggedOver={dragHandler?.isDraggedOver}
                    placeholderRef={dragHandler?.setRef}
                    size={size}
                />
                <ImageUploadForm
                    fileInputRef={onFileInputRef}
                    filePicker={() => openFileSelection({fileInputRef})}
                    mimeTypes={mimeTypes}
                    onFileChange={onFileChange}
                />
            </div>
        );
    }

    return (
        <div className={clsx('group relative flex items-center justify-center', borderStyle === 'dashed' && 'rounded', className)} data-testid="media-upload-filled">
            {src && (
                <>
                    <img alt={alt} className={clsx('mx-auto h-full w-full object-cover', borderStyle === 'dashed' && 'rounded')} src={src} />
                    <div className={clsx('absolute inset-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 opacity-0 transition-all group-hover:opacity-100', borderStyle === 'dashed' && 'rounded')}></div>
                </>
            )}

            {!isLoading && (
                <div className="absolute top-2 right-2 flex space-x-2 opacity-0 transition-all group-hover:opacity-100">
                    {additionalActions}
                    { isPinturaEnabled && <IconButton Icon={EditIcon} onClick={() => openImageEditor({
                        image: src,
                        handleSave: (editedImage) => {
                            onFileChange({
                                target: {
                                    files: [editedImage]
                                }
                            });
                        }
                    })} /> }
                    <IconButton dataTestId="media-upload-remove" Icon={DeleteIcon} onClick={onRemove} />
                </div>
            )}

            {isLoading && (
                <div
                    className={clsx('absolute inset-0 flex min-w-full items-center justify-center overflow-hidden border border-dashed border-grey/20 bg-grey-50', borderStyle === 'dashed' && 'rounded')}
                    data-testid="custom-thumbnail-progress"
                >
                    <ProgressBar style={progressStyle} />
                </div>
            )}
        </div>
    );
}

MediaUploader.propTypes = {
    className: PropTypes.string,
    src: PropTypes.string,
    alt: PropTypes.string,
    desc: PropTypes.string,
    icon: PropTypes.string,
    size: PropTypes.string,
    borderStyle: PropTypes.string,
    mimeTypes: PropTypes.arrayOf(PropTypes.string),
    onFileChange: PropTypes.func,
    dragHandler: PropTypes.shape({
        isDraggedOver: PropTypes.bool,
        setRef: PropTypes.func
    }),
    isLoading: PropTypes.bool,
    progress: PropTypes.number,
    errors: PropTypes.arrayOf(PropTypes.shape({
        message: PropTypes.string
    })),
    onRemoveMedia: PropTypes.func
};
