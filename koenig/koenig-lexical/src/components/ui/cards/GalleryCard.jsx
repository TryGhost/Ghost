import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {ReactComponent as DeleteIcon} from '../../../assets/icons/kg-trash.svg';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ProgressBar} from '../ProgressBar';
// import {IconButton} from '../IconButton';

function GalleryRow({index, images, deleteImage}) {
    const GalleryImages = images.map((image, idx) => {
        const position = idx === 0 ? 'first' : idx === images.length - 1 ? 'last' : 'middle';
        return <GalleryImage key={image.fileName} deleteImage={deleteImage} image={image} position={position} />;
    });

    return (
        <div className={`flex flex-row justify-center ${index !== 0 && 'mt-4'}`} data-row={index}>
            {GalleryImages}
        </div>
    );
}

function GalleryImage({image, deleteImage, position}) {
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
        >
            <img
                alt={image.alt}
                className="pointer-events-none block h-full w-full"
                height={image.height}
                src={image.previewSrc || image.src}
                width={image.width}
            />

            <div className={`pointer-events-none invisible absolute inset-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 opacity-0 transition-all group-hover:visible group-hover:opacity-100 ${overlayClasses.join(' ')}`}>
                <div className="flex flex-row-reverse">
                    {/* Could be swapped for IconButton, but for some reason it's not working */}
                    {/* <IconButton Icon={DeleteIcon} onClick={deleteImage(image)} /> */}
                    <button className="bg-white-90 pointer-events-auto rounded-lg px-3" type="button" onClick={() => deleteImage(image)}>
                        <DeleteIcon className="h-4 w-4"/>
                    </button>
                </div>
            </div>
        </div>
    );
}

function PopulatedGalleryCard({filesDropper, images, deleteImage}) {
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
        return <GalleryRow key={idx} deleteImage={deleteImage} images={rowImages} index={idx} />;
    });

    return (
        <div className="not-kg-prose flex flex-col" data-gallery>
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
    uploader = {}
}) {
    const openFilePicker = () => {
        fileInputRef.current.click();
    };

    const {isLoading, progress} = uploader;
    const {isDraggedOver} = filesDropper;

    return (
        <figure className="not-kg-prose">
            <div ref={filesDropper.setRef} className="relative" data-testid="gallery-container">
                {images.length
                    ? <PopulatedGalleryCard deleteImage={deleteImage} filesDropper={filesDropper} images={images} />
                    : <EmptyGalleryCard filesDropper={filesDropper} openFilePicker={openFilePicker} />
                }

                {isLoading ? <UploadOverlay progress={progress} /> : null}
                {images.length && isDraggedOver ? <FileDragOverlay /> : null}

                {errorMessage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60" data-testid="gallery-error">
                        <span className="center sans-serif f7 block bg-red px-2 font-bold text-white">
                            {errorMessage}.
                            <button className="ml-2 cursor-pointer underline" data-testid="clear-gallery-error" type="button" onClick={clearErrorMessage}>
                                Dismiss
                            </button>
                        </span>
                    </div>
                )}

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

GalleryCard.propTypes = {
    isSelected: PropTypes.bool,
    onFileChange: PropTypes.func,
    captionEditor: PropTypes.object,
    captionEditorInitialState: PropTypes.string,
    errorMessage: PropTypes.string
};
