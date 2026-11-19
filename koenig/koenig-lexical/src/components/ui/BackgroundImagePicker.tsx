import FileUploadIcon from '../../assets/icons/kg-upload-fill.svg?react';
import React from 'react';
import TrashIcon from '../../assets/icons/kg-trash.svg?react';
import {ProgressBar} from './ProgressBar';

interface FileUploadingProps {
    progress?: number;
}

function FileUploading({progress}: FileUploadingProps) {
    const progressStyle = {
        width: `${(progress ?? 0).toFixed(0)}%`
    };

    return (
        <div className="h-full border border-transparent">
            <div className="relative flex h-[120px] items-center justify-center border border-grey/20 bg-grey-50 before:pb-[12.5%] dark:bg-grey-900">
                <div className="flex w-full items-center justify-center overflow-hidden">
                    <ProgressBar style={progressStyle} />
                </div>
            </div>
        </div>
    );
}

interface BackgroundImagePickerProps {
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    backgroundImageSrc?: string;
    type?: string;
    handleClearBackgroundImage?: () => void;
    fileInputRef?: React.Ref<HTMLInputElement>;
    openFilePicker?: () => void;
    isUploading?: boolean;
    progress?: number;
}

export function BackgroundImagePicker({onFileChange,
    backgroundImageSrc,
    type,
    handleClearBackgroundImage,
    fileInputRef,
    openFilePicker,
    isUploading,
    progress}: BackgroundImagePickerProps) {
    if (isUploading) {
        return (
            <FileUploading progress={progress} />
        );
    }
    return (
        <>
            <form>
                <input
                    ref={fileInputRef}
                    accept='image/*'
                    hidden={true}
                    name="image-input"
                    type='file'
                    onChange={onFileChange}
                />
            </form>
            {
                type === 'image' && (
                    <div className="w-full">
                        <div className="relative">
                            <div className="flex w-full items-center justify-center">
                                {
                                    backgroundImageSrc ?
                                        <>
                                            <div className="group relative mb-4 w-full rounded-md">
                                                <div className="absolute inset-0 rounded-md bg-gradient-to-t from-black/0 via-black/5 to-black/30 opacity-0 transition-all group-hover:opacity-100">
                                                </div>
                                                <div className="absolute right-5 top-5 flex opacity-0 transition-all group-hover:opacity-100">
                                                    <button className="pointer-events-auto flex h-8 w-9 cursor-pointer items-center justify-center rounded-md bg-white/90 transition-all hover:bg-white" type="button" onClick={handleClearBackgroundImage}>
                                                        <TrashIcon className="size-5 fill-grey-900 stroke-[3px] transition-all ease-linear group-hover:scale-105" />
                                                    </button>
                                                </div>
                                                <img alt='backgroundHeaderImage' className="max-h-64 w-full rounded-md object-cover" data-testid="image-picker-background" src={backgroundImageSrc} />
                                            </div>
                                        </>
                                        :
                                        <button className="group flex h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-md border border-grey-100 bg-grey-50 dark:border-grey-800 dark:bg-grey-900" type="button" onClick={openFilePicker}>
                                            <FileUploadIcon className="size-5 fill-grey-700 stroke-[3px] transition-all ease-linear group-hover:scale-105" />
                                            <span className="px-1 text-[1.35rem] font-medium text-grey-700">Click to upload background image</span>
                                        </button>
                                }
                            </div>
                        </div>
                    </div>
                )
            }

        </>
    );
}
