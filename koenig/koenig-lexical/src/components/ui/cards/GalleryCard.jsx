import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {ReactComponent as DeleteIcon} from '../../../assets/icons/kg-trash.svg';
import {IconButton} from '../IconButton';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ProgressBar} from '../ProgressBar';
// import {IconButton} from '../IconButton';

function GalleryRow({index, images, deleteImage, isDragging}) {
    const GalleryImages = images.map((image, idx) => {
        const position =
            images.length === 1 ? 'single' :
                idx === 0 ? 'first' :
                    idx === images.length - 1 ? 'last' :
                        'middle';

        return <GalleryImage key={image.fileName} deleteImage={deleteImage} image={image} isDragging={isDragging} position={position} />;
    });

    return (
        <div className={`flex flex-row justify-center ${index !== 0 && 'mt-4'}`} data-row={index}>
            {GalleryImages}
        </div>
    );
}

function GalleryImage({image, deleteImage, position, isDragging}) {
    const aspectRatio = (image.width || 1) / (image.height || 1);
    const style = {
        flex: `${aspectRatio} 1 0%`
    };

    let classes = [];
    let overlayClasses = [];

    switch (position) {
    case 'first':
        classes = ['pr-2'];
        overlayClasses = ['mr-2'];
        break;
    case 'middle':
        classes = ['pl-2', 'pr-2'];
        overlayClasses = ['ml-2', 'mr-2'];
        break;
    case 'last':
        classes = ['pl-2'];
        overlayClasses = ['ml-2'];
        break;
    default:
    }

    return (
        <div
            className={`group relative ${classes.join(' ')}`}
            data-testid="gallery-image"
            style={style}
            data-image
        >
            <img
                alt={image.alt}
                className="pointer-events-none block h-full w-full"
                height={image.height}
                src={image.previewSrc || image.src}
                width={image.width}
            />

            {isDragging ? null : (
                <div className={`pointer-events-none invisible absolute inset-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 p-3 opacity-0 transition-all group-hover:visible group-hover:opacity-100 ${overlayClasses.join(' ')}`}>
                    <div className="flex flex-row-reverse">
                        <IconButton Icon={DeleteIcon} onClick={() => deleteImage(image)} />
                    </div>
                </div>
            )}
        </div>
    );
}

function PopulatedGalleryCard({filesDropper, images, deleteImage, reorderHandler, isDragging}) {
    const rows = [];
    const noOfImages = images.length;

    // 3 images per row unless last row would have a single image in which
    // case the last 2 rows will have 2 images
    const maxImagesInRow = function (idx) {
        return noOfImages > 1 && (noOfImages % 3 === 1) && (idx === (noOfImages - 2));
    };

    images.forEach((image, idx) => {
        let row = image.row || 0;

        // start a new display row if necessary
        if (maxImagesInRow(idx)) {
            row = row + 1;
        }

        if (!rows[row]) {
            rows[row] = [];
        }

        rows[row].push(image);
    });

    const GalleryRows = rows.map((rowImages, idx) => {
        // eslint-disable-next-line react/no-array-index-key
        return <GalleryRow key={idx} deleteImage={deleteImage} images={rowImages} index={idx} isDragging={isDragging} />;
    });

    return (
        <div ref={reorderHandler.setContainerRef} className="not-kg-prose flex flex-col" data-gallery>
            {GalleryRows}
        </div>
    );
}

function EmptyGalleryCard({filesDropper, openFilePicker}) {
    return (
        <MediaPlaceholder
            desc="Click to select up to 9 images"
            filePicker={openFilePicker}
            icon='gallery'
            isDraggedOver={filesDropper.isDraggedOver}
            multiple={true}
            size='large'
        />
    );
}

function UploadOverlay({progress}) {
    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
    };

    return (
        <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50" data-testid="gallery-progress">
            <ProgressBar bgStyle="transparent" style={progressStyle} />
        </div>
    );
}

function FileDragOverlay() {
    return (
        <div className="bg-black-60 pointer-events-none absolute inset-0 flex items-center bg-black/60" data-kg-card-drag-text>
            <span className="sans-serif fw7 f7 block w-full text-center font-bold text-white">
                Drop to add up to 9 images
            </span>
        </div>
    );
}

export function GalleryCard({
    captionEditor,
    captionEditorInitialState,
    clearErrorMessage,
    deleteImage,
    filesDropper,
    errorMessage,
    fileInputRef,
    imageMimeTypes = [],
    images = [],
    isSelected,
    onFileChange,
    uploader = {},
    reorderHandler = {}
}) {
    const openFilePicker = () => {
        fileInputRef.current.click();
    };

    const {isLoading, progress} = uploader;
    const {isDraggedOver: filesDraggedOver} = filesDropper;
    const {isDraggedOver: reorderDraggedOver} = reorderHandler;
    const isDragging = filesDraggedOver || reorderDraggedOver;

    return (
        <figure className="not-kg-prose">
            <div ref={filesDropper.setRef} className="relative" data-testid="gallery-container">
                {images.length
                    ? <PopulatedGalleryCard deleteImage={deleteImage} filesDropper={filesDropper} images={images} isDragging={isDragging} reorderHandler={reorderHandler} />
                    : <EmptyGalleryCard filesDropper={filesDropper} openFilePicker={openFilePicker} />
                }

                {isLoading ? <UploadOverlay progress={progress} /> : null}
                {images.length && filesDraggedOver ? <FileDragOverlay /> : null}

                {errorMessage && !isDragging ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60" data-testid="gallery-error">
                        <span className="center sans-serif f7 block bg-red px-2 font-bold text-white">
                            {errorMessage}.
                            <button className="ml-2 cursor-pointer underline" data-testid="clear-gallery-error" type="button" onClick={clearErrorMessage}>
                                Dismiss
                            </button>
                        </span>
                    </div>
                ) : null}

                <form onChange={onFileChange}>
                    <input
                        ref={fileInputRef}
                        accept={imageMimeTypes.join(',')}
                        hidden={true}
                        multiple={true}
                        name="image-input"
                        type='file'
                    />
                </form>
            </div>

            <CardCaptionEditor
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                captionPlaceholder="Type caption for gallery (optional)"
                isSelected={isSelected}
            />
        </figure>
    );
}

GalleryRow.propTypes = {
    deleteImage: PropTypes.func,
    images: PropTypes.array,
    index: PropTypes.number,
    isDragging: PropTypes.bool
};

GalleryImage.propTypes = {
    deleteImage: PropTypes.func,
    image: PropTypes.object,
    position: PropTypes.string,
    isDragging: PropTypes.bool
};

PopulatedGalleryCard.propTypes = {
    deleteImage: PropTypes.func,
    filesDropper: PropTypes.object,
    images: PropTypes.array,
    isDragging: PropTypes.bool,
    reorderHandler: PropTypes.object
};

EmptyGalleryCard.propTypes = {
    filesDropper: PropTypes.object,
    openFilePicker: PropTypes.func
};

UploadOverlay.propTypes = {
    progress: PropTypes.number
};

GalleryCard.propTypes = {
    isSelected: PropTypes.bool,
    onFileChange: PropTypes.func,
    captionEditor: PropTypes.object,
    captionEditorInitialState: PropTypes.string,
    errorMessage: PropTypes.string,
    clearErrorMessage: PropTypes.func,
    deleteImage: PropTypes.func,
    fileInputRef: PropTypes.object,
    filesDropper: PropTypes.object,
    imageMimeTypes: PropTypes.array,
    images: PropTypes.array,
    uploader: PropTypes.object,
    reorderHandler: PropTypes.object
};
