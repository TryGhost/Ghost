import DeleteIcon from '../../../../assets/icons/kg-trash.svg?react';
import React from 'react';
import WandIcon from '../../../../assets/icons/kg-wand.svg?react';
import {IconButton} from '../../IconButton.jsx';
import {MediaPlaceholder} from '../../MediaPlaceholder.jsx';
import {ProgressBar} from '../../ProgressBar.jsx';
import {TextInput} from '../../TextInput';
import {openFileSelection} from '../../../../utils/openFileSelection.js';

export function ProductCardImage({
    imgSrc,
    imgAlt = '',
    imgUploader = {},
    imgDragHandler = {},
    onImgChange,
    onImgAltChange,
    imgMimeTypes,
    onRemoveImage,
    isPinturaEnabled,
    openImageEditor,
    isEditing
}) {
    const fileInputRef = React.useRef(null);
    const [isEditingAlt, setIsEditingAlt] = React.useState(false);

    // always close the alt input when leaving edit mode or when the image goes away
    React.useEffect(() => {
        if (!isEditing || !imgSrc) {
            setIsEditingAlt(false);
        }
    }, [isEditing, imgSrc]);

    const onRemove = (e) => {
        e.stopPropagation(); // prevents card from losing selected state
        onRemoveImage();
    };

    const toggleIsEditingAlt = (e) => {
        e.stopPropagation(); // prevents card from losing editing state
        setIsEditingAlt(!isEditingAlt);
    };

    const handleAltChange = (e) => {
        onImgAltChange?.(e.target.value);
    };

    const showPlaceholder = imgDragHandler.isDraggedOver || !imgSrc;
    const showAltToggle = isEditing && !showPlaceholder;
    const showAltInput = showAltToggle && isEditingAlt;
    const progressStyle = {
        width: `${imgUploader.progress?.toFixed(0)}%`
    };

    return (
        <>
            <div className="not-kg-prose group/image relative mb-4 w-full rounded-md">
                {
                    showPlaceholder
                        ? (
                            <>
                                <MediaPlaceholder
                                    desc={isEditing ? 'Click to select a product image' : ''}
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
                                <img alt={imgAlt} className="mx-auto max-h-[100%] rounded-md object-cover" data-testid="product-card-image" src={imgSrc} />

                                {
                                    isEditing && (
                                        <>
                                            <div className="absolute inset-0 rounded-md bg-gradient-to-t from-black/0 via-black/5 to-black/30 opacity-0 transition-all group-hover/image:opacity-100"></div>
                                        </>
                                    )
                                }

                                {
                                    isEditing && (
                                        <>
                                            <div className="absolute right-5 top-5 flex opacity-0 transition-all group-hover/image:opacity-100">
                                                <IconButton dataTestId="replace-product-image" Icon={DeleteIcon} label="Delete" onClick={onRemove} />
                                            </div>
                                        </>
                                    )
                                }

                                {
                                    isEditing && isPinturaEnabled && (
                                        <>
                                            <div className="absolute right-16 top-5 flex opacity-0 transition-all group-hover/image:opacity-100">
                                                <IconButton dataTestId="replace-product-image" Icon={WandIcon} label="Edit" onClick={() => openImageEditor({
                                                    image: imgSrc,
                                                    handleSave: (editedImage) => {
                                                        onImgChange({
                                                            target: {
                                                                files: [editedImage]
                                                            }
                                                        });
                                                    }
                                                })} />
                                            </div>
                                        </>
                                    )
                                }

                                {
                                    showAltToggle && (
                                        <button
                                            aria-pressed={isEditingAlt}
                                            className={`absolute bottom-0 right-0 m-2 cursor-pointer rounded-md border px-1 font-sans text-[1.3rem] font-normal leading-7 tracking-wide transition-all duration-100 ${isEditingAlt ? 'border-green bg-green text-white' : 'border-grey bg-white/90 text-grey-900 hover:bg-white'}`}
                                            data-testid="product-image-alt-toggle"
                                            name="alt-toggle-button"
                                            type="button"
                                            onClick={toggleIsEditingAlt}
                                        >
                                            Alt
                                        </button>
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

            {
                showAltInput && (
                    <div className="not-kg-prose -mt-2 mb-4 w-full">
                        <TextInput
                            aria-label="Alt text"
                            className="w-full bg-transparent font-sans text-sm font-normal leading-[1.625] tracking-wide text-grey-800 placeholder:text-grey-500 focus-visible:outline-none dark:text-grey-500 dark:placeholder:text-grey-800"
                            data-testid="product-image-alt-input"
                            placeholder="Type alt text for product image (optional)"
                            value={imgAlt}
                            autoFocus
                            data-koenig-dnd-disabled
                            onChange={handleAltChange}
                        />
                    </div>
                )
            }
        </>
    );
}
