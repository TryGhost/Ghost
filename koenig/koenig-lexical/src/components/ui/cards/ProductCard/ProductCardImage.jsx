import React from 'react';
import {ReactComponent as DeleteIcon} from '../../../../assets/icons/kg-trash.svg';
import {IconButton} from '../../IconButton.jsx';
import {MediaPlaceholder} from '../../MediaPlaceholder.jsx';
import {ProgressBar} from '../../ProgressBar.jsx';
import {openFileSelection} from '../../../../utils/openFileSelection.js';

export function ProductCardImage({
    imgSrc,
    imgUploader = {},
    imgDragHandler = {},
    onImgChange,
    imgMimeTypes,
    onRemoveImage,
    isEditing
}) {
    const fileInputRef = React.useRef(null);

    const onRemove = (e) => {
        e.stopPropagation(); // prevents card from losing selected state
        onRemoveImage();
    };

    const showPlaceholder = imgDragHandler.isDraggedOver || !imgSrc;
    const progressStyle = {
        width: `${imgUploader.progress?.toFixed(0)}%`
    };

    return (
        <div className="group relative mb-4 w-full rounded">
            {
                showPlaceholder
                    ? (
                        <>
                            <MediaPlaceholder
                                desc="Click to select a product image"
                                errors={imgUploader.errors}
                                filePicker={() => openFileSelection({fileInputRef})}
                                icon='product'
                                isDraggedOver={imgDragHandler.isDraggedOver}
                                placeholderRef={imgDragHandler.setRef}
                                size='small'
                            />

                            <form onChange={onImgChange}>
                                <input
                                    ref={fileInputRef}
                                    accept={imgMimeTypes.join(',')}
                                    hidden={true}
                                    name="image-input"
                                    type='file'
                                />
                            </form>
                        </>
                    )
                    : (
                        <>
                            <img className="mx-auto max-h-[100%] rounded object-cover" data-testid="product-card-image" src={imgSrc} />

                            {
                                isEditing && (
                                    <>
                                        <div className="absolute inset-0 rounded bg-gradient-to-t from-black/0 via-black/5 to-black/30 opacity-0 transition-all group-hover:opacity-100"></div>
                                        <div className="absolute top-5 right-5 flex opacity-0 transition-all group-hover:opacity-100">
                                            <IconButton dataTestID="replace-product-image" Icon={DeleteIcon} onClick={onRemove} />
                                        </div>
                                    </>
                                )
                            }

                            {
                                imgUploader.isLoading && (
                                    <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50">
                                        <ProgressBar bgStyle='transparent' style={progressStyle} />
                                    </div>
                                )
                            }
                        </>
                    )
            }
        </div>
    );
}
