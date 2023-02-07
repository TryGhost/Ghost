import React from 'react';
import {Toggle} from './Toggle';
import {Input} from './Input';
import {ButtonGroup} from './ButtonGroup';
import {MediaPlaceholder} from './MediaPlaceholder';
import {ReactComponent as DeleteIcon} from '../../assets/icons/kg-trash.svg';
import {ProgressBar} from './ProgressBar';
import {openFileSelection} from '../../utils/openFileSelection';
import ImageUploadForm from './ImageUploadForm';
import useMovable from '../../hooks/useMovable';

export function SettingsPanel({children}) {
    const {ref} = useMovable({adjustOnResize: true});
    return (
        <div className="not-kg-prose absolute z-[9999999] m-0 flex w-[320px] flex-col gap-2 overflow-y-auto rounded-lg bg-white bg-clip-padding p-6 font-sans shadow"
            ref={ref}
            data-testid="video-settings-panel"
        >
            {children}
        </div>
    );
}

export function ToggleSetting({label, description, isChecked, onChange, dataTestID}) {
    return (
        <div className="flex w-full items-center justify-between text-[1.3rem]">
            <div>
                <div className="font-bold text-grey-900">{label}</div>
                {description &&
                    <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
                }
            </div>
            <div className="flex shrink-0 pl-2">
                <Toggle isChecked={isChecked} onChange={onChange} dataTestID={dataTestID} />
            </div>
        </div>
    );
}

export function InputSetting({label, description, value, placeholder}) {
    return (
        <div className="flex w-full flex-col justify-between gap-2 text-[1.3rem]">
            <div className="font-bold text-grey-900">{label}</div>
            <Input value={value} placeholder={placeholder} />
            {description &&
                    <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
            }
        </div>
    );
}

export function ButtonGroupSetting({label, onClick, selectedName, buttons}) {
    return (
        <div className="flex w-full items-center justify-between text-[1.3rem]">
            <div className="font-bold text-grey-900">{label}</div>

            <div className="shrink-0 pl-2">
                <ButtonGroup onClick={onClick} selectedName={selectedName} buttons={buttons} />
            </div>
        </div>
    );
}

export function ThumbnailSetting({label, onFileChange, handleDrag, handleDrop, isDraggedOver, src, alt, isLoading, dataTestID, progress, onRemoveCustomThumbnail, icon, desc, size}) {
    const fileInputRef = React.useRef(null);

    const onFileInputRef = (element) => {
        fileInputRef.current = element;
    };

    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
    };

    const onRemove = (e) => {
        e.stopPropagation(); // prevents card from losing selected state
        onRemoveCustomThumbnail();
    };

    const isEmpty = !isLoading && !src;

    return (
        <div className="text-[1.3rem]" data-testid="custom-thumbnail">
            <div className="font-bold text-grey-900">{label}</div>

            {isEmpty && 
                <div className="h-32">
                    <MediaPlaceholder
                        handleDrag={handleDrag}
                        handleDrop={handleDrop}
                        filePicker={() => openFileSelection({fileInputRef})}
                        icon={icon}
                        desc={desc}
                        size={size}
                        borderStyle='dashed'
                        isDraggedOver={isDraggedOver}
                    />
                    <ImageUploadForm
                        filePicker={() => openFileSelection({fileInputRef})}
                        onFileChange={onFileChange}
                        fileInputRef={onFileInputRef}
                    />
                </div>
            }

            {!isEmpty && (
                <div className="group relative flex h-32 items-center justify-center rounded" data-testid="custom-thumbnail-filled">
                    {src && (
                        <>
                            <img className="mx-auto h-full w-full rounded object-cover" src={src} alt={alt} />
                            <div className="absolute inset-0 rounded bg-gradient-to-t from-black/0 via-black/5 to-black/30 opacity-0 transition-all group-hover:opacity-100"></div>
                        </>
                    )}

                    {!isLoading && (
                        <button type="button" className="group absolute top-2 right-2 flex w-full max-w-[34px] cursor-pointer items-center justify-center rounded bg-white/90 px-2 py-[.6rem] opacity-0 transition-all hover:bg-white group-hover:opacity-100" onClick={onRemove} data-testid={dataTestID}>
                            <DeleteIcon className="h-5 w-5 fill-grey-900" />
                        </button>
                    )}

                    {isLoading && (
                        <div
                            className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden rounded border border-dashed border-grey/20 bg-grey-50"
                            data-testid="custom-thumbnail-progress"
                        >
                            <ProgressBar style={progressStyle} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function SettingsDivider() {
    return (
        <hr className="-mx-6 my-2 border-grey-200" />
    );
}
