import DeleteIcon from '../../../../assets/icons/kg-trash.svg?react';
import React from 'react';
import WandIcon from '../../../../assets/icons/kg-wand.svg?react';
import {IconButton} from '../../IconButton';
import {MediaPlaceholder} from '../../MediaPlaceholder';
import {ProgressBar} from '../../ProgressBar';
import {createFileInputChangeEventFromBlob} from '../../../../utils/createFileInputChangeEvent';
import {openFileSelection} from '../../../../utils/openFileSelection';
import type {OpenImageEditor} from '../../../../hooks/usePinturaEditor';

interface ProductCardImageProps {
    imgSrc?: string;
    imgUploader?: {isLoading?: boolean; progress?: number; errors?: {message: string}[]};
    imgDragHandler?: {isDraggedOver?: boolean; setRef?: React.Ref<HTMLDivElement>};
    onImgChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    imgMimeTypes?: string[];
    onRemoveImage?: () => void;
    isPinturaEnabled?: boolean;
    openImageEditor?: OpenImageEditor;
    isEditing?: boolean;
}

export function ProductCardImage({
    imgSrc,
    imgUploader = {},
    imgDragHandler = {},
    onImgChange,
    imgMimeTypes,
    onRemoveImage,
    isPinturaEnabled,
    openImageEditor,
    isEditing
}: ProductCardImageProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const onRemove = (e: React.MouseEvent) => {
        e.stopPropagation(); // prevents card from losing selected state
        onRemoveImage?.();
    };

    const showPlaceholder = imgDragHandler.isDraggedOver || !imgSrc;
    const progressStyle = {
        width: `${(imgUploader.progress ?? 0).toFixed(0)}%`
    };

    return (
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

                            <form onChange={onImgChange as unknown as React.FormEventHandler}>
                                <input
                                    ref={fileInputRef}
                                    accept={imgMimeTypes?.join(',')}
                                    hidden={true}
                                    name="image-input"
                                    type='file'
                                />
                            </form>
                        </>
                    )
                    : (
                        <>
                            <img alt="Product thumbnail" className="mx-auto max-h-[100%] rounded-md object-cover" data-testid="product-card-image" src={imgSrc} />

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
                                            <IconButton dataTestId="replace-product-image" Icon={WandIcon} label="Edit" onClick={() => openImageEditor?.({
                                                image: imgSrc || '',
                                                handleSave: (editedImage: Blob) => {
                                                    onImgChange?.(createFileInputChangeEventFromBlob(editedImage));
                                                }
                                            })} />
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
