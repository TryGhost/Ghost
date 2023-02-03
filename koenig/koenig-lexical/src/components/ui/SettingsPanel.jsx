import React, {useRef} from 'react';
import {Toggle} from './Toggle';
import {Input} from './Input';
import {ReactComponent as ImageRegularIcon} from '../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImageWideIcon} from '../../assets/icons/kg-img-wide.svg';
import {ReactComponent as ImageFullIcon} from '../../assets/icons/kg-img-full.svg';
import {ReactComponent as FileUploadIcon} from '../../assets/icons/kg-file-upload.svg';
import {ReactComponent as ReplaceIcon} from '../../assets/icons/kg-replace.svg';
import {ProgressBar} from './ProgressBar';
import useMovable from '../../hooks/useMovable';

export function SettingsPanel({
    isLoopChecked,
    onChangeLoop,
    onCardWidthChange,
    cardWidth,
    customThumbnail,
    onCustomThumbnailChange,
    isCustomThumbnailLoading,
    customThumbnailUploadProgress,
    onRemoveCustomThumbnail
}) {
    const {ref} = useMovable({adjustOnResize: true});
    return (
        <div className="not-kg-prose absolute top-[40px] right-[-80px] z-[9999999] m-0 flex w-[320px] flex-col gap-2 overflow-y-auto rounded-lg bg-white bg-clip-padding p-6 font-sans shadow"
            ref={ref}
            data-testid="video-settings-panel"
        >
            <CardWidthSetting label="Video width" onClick={onCardWidthChange} selectedName={cardWidth} />
            <ToggleSetting
                label='Loop'
                description='Autoplay your video on a loop without sound.'
                isChecked={isLoopChecked}
                onChange={onChangeLoop}
                dataTestID="loop-video"
            />

            {
                !isLoopChecked && (
                    <CustomThumbnailSettings
                        src={customThumbnail}
                        onFileChange={onCustomThumbnailChange}
                        isLoading={isCustomThumbnailLoading}
                        progress={customThumbnailUploadProgress}
                        onRemoveCustomThumbnail={onRemoveCustomThumbnail}
                    />
                )
            }

            <InputSetting label='Button title' value='' placeholder='Add button text' />
        </div>
    );
}

function CustomThumbnailSettings({onFileChange, src, isLoading, progress, onRemoveCustomThumbnail}) {
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
            <div className="font-bold text-grey-900">Custom thumbnail</div>

            {isEmpty && <EmptyCustomThumbnail onFileChange={onFileChange} />}

            {!isEmpty && (
                <div className="relative flex h-[120px] items-center justify-center rounded" data-testid="custom-thumbnail-filled">
                    {src && (
                        <img className="mx-auto max-h-[120px]" src={src} alt="Custom thumbnail" />
                    )}

                    {!isLoading && (
                        <button type="button" className="absolute top-1 right-1" onClick={onRemove} data-testid="custom-thumbnail-replace">
                            <ReplaceIcon />
                        </button>
                    )}

                    {isLoading && (
                        <div
                            className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50"
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

function EmptyCustomThumbnail({onFileChange}) {
    const inputRef = useRef(null);
    const onClick = () => {
        inputRef.current.click();
    };

    return (
        <>
            <div
                className="flex h-[120px] items-center justify-center rounded border border-dashed border-grey-300 bg-grey-100"
                onClick={onClick}
                data-testid="custom-thumbnail-empty"
            >
                <FileUploadIcon className="h-5 w-5 text-grey-600" />
            </div>

            <form onChange={onFileChange}>
                <input
                    name="image-input"
                    type='file'
                    accept='image/*'
                    ref={inputRef}
                    hidden={true}
                />
            </form>
        </>
    );
}

function CardWidthSetting({label, onClick, selectedName}) {
    return (
        <div className="flex w-full items-center justify-between text-[1.3rem]">
            <div className="font-bold text-grey-900">{label}</div>

            <div className="shrink-0 pl-2">
                <ul className="flex items-center justify-evenly rounded bg-grey-100 font-sans text-md font-normal text-white">
                    <li>
                        <IconButton
                            onClick={onClick}
                            label="Regular"
                            name="regular"
                            selectedName={selectedName}
                        >
                            <ImageRegularIcon />
                        </IconButton>
                    </li>

                    <li>
                        <IconButton
                            onClick={onClick}
                            label="Wide"
                            name="wide"
                            selectedName={selectedName}
                        >
                            <ImageWideIcon />
                        </IconButton>
                    </li>

                    <li>
                        <IconButton
                            onClick={onClick}
                            label="Full"
                            name="full"
                            selectedName={selectedName}
                        >
                            <ImageFullIcon />
                        </IconButton>
                    </li>
                </ul>
            </div>
        </div>
    );
}

function IconButton({onClick, label, name, selectedName, children}) {
    const isActive = name === selectedName;
    return (
        <button
            type="button"
            className={`flex h-7 w-8 items-center justify-center ${isActive ? 'bg-white' : '' } m-1`}
            onClick={() => onClick(name)}
            aria-label={label}
        >
            {children}
        </button>
    );
}

export function ToggleSetting({label, description, isChecked, onChange, dataTestID}) {
    return (
        <div className="flex w-full items-center justify-between border-b border-b-grey-200 text-[1.3rem] last-of-type:border-b-0">
            <div>
                <div className="font-bold text-grey-900">{label}</div>
                {description &&
                    <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
                }
            </div>
            <div className="shrink-0 pl-2">
                <Toggle isChecked={isChecked} onChange={onChange} dataTestID={dataTestID} />
            </div>
        </div>
    );
}

export function InputSetting({label, description, value, placeholder}) {
    return (
        <div className="flex w-full flex-col justify-between gap-2 border-b border-b-grey-200 text-[1.3rem] last-of-type:border-b-0">
            <div className="font-bold text-grey-900">{label}</div>
            <Input value={value} placeholder={placeholder} />
            {description &&
                    <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
            }
        </div>
    );
}
