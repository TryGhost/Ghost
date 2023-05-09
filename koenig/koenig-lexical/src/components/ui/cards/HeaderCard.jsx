import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {Button} from '../Button';
import {ButtonGroupSetting, ColorPickerSetting, InputSetting, InputUrlSetting, SettingsDivider, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {ReactComponent as FileUploadIcon} from '../../../assets/icons/kg-upload-fill.svg';
import {ProgressBar} from '../ProgressBar';
import {ReactComponent as TrashIcon} from '../../../assets/icons/kg-trash.svg';
import {isEditorEmpty} from '../../../utils/isEditorEmpty';

export const HEADER_COLORS = {
    dark: 'bg-black',
    light: 'bg-grey-100',
    accent: 'bg-accent',
    image: 'bg-grey-300 dark:bg-grey-950 bg-gradient-to-t from-black/0 via-black/5 to-black/30'
};

export const HEADER_TEXT_COLORS = {
    dark: 'text-white caret-white',
    light: 'text-black caret-black',
    // kg-header-accent fixes the link color
    accent: 'text-white caret-white kg-header-accent',
    image: 'text-white caret-white'
};

function FileUploading({progress}) {
    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
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

function ImagePicker({onFileChange,
    backgroundImageSrc,
    handleClearBackgroundImage,
    fileInputRef,
    backgroundImagePreview,
    openFilePicker,
    isUploading,
    progress}) {
    if (isUploading) {
        return (
            <FileUploading progress={progress} />
        );
    }
    return (
        <>
            <form onChange={onFileChange}>
                <input
                    ref={fileInputRef}
                    accept='image/*'
                    hidden={true}
                    name="image-input"
                    type='file'
                />
            </form>
            {
                backgroundImagePreview && (
                    <div className="w-full">
                        <div className="relative">
                            <div className="flex w-full items-center justify-center">
                                {
                                    backgroundImageSrc ?
                                        <>
                                            <div className="group relative mb-4 w-full rounded">
                                                <div className="absolute inset-0 rounded bg-gradient-to-t from-black/0 via-black/5 to-black/30 opacity-0 transition-all group-hover:opacity-100">
                                                </div>
                                                <div className="absolute top-5 right-5 flex opacity-0 transition-all group-hover:opacity-100">
                                                    <button className="pointer-events-auto flex h-8 w-9 cursor-pointer items-center justify-center rounded bg-white/90 transition-all hover:bg-white" type="button" onClick={handleClearBackgroundImage}>
                                                        <TrashIcon className="h-5 w-5 fill-grey-900 stroke-[3px] transition-all ease-linear group-hover:scale-105" />
                                                    </button>
                                                </div>
                                                <img alt='backgroundHeaderImage' className="max-h-64 w-full rounded object-cover" data-testid="image-picker-background" src={backgroundImageSrc} />
                                            </div>
                                        </>
                                        :
                                        <button className="group flex h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed border-grey-300 bg-grey-50 dark:border-grey-800 dark:bg-grey-900" type="button" onClick={openFilePicker}>
                                            <FileUploadIcon className="h-5 w-5 fill-grey-700 stroke-[3px] transition-all ease-linear group-hover:scale-105" />
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

export function HeaderCard({isEditing,
    size,
    headerPlaceholder,
    subheaderPlaceholder,
    subheader,
    button,
    buttonText,
    buttonPlaceholder,
    buttonUrl,
    handleColorSelector,
    handleSizeSelector,
    handleButtonText,
    handleButtonUrl,
    backgroundImageSrc,
    onFileChange,
    handleClearBackgroundImage,
    backgroundImagePreview,
    fileInputRef,
    openFilePicker,
    type,
    header,
    headerTextEditor,
    subheaderTextEditor,
    fileUploader,
    headerTextEditorInitialState,
    subheaderTextEditorInitialState,
    handleButtonToggle}) {
    const buttonGroupChildren = [
        {
            label: 'S',
            name: 'small'
        },
        {
            label: 'M',
            name: 'medium'
        },
        {
            label: 'L',
            name: 'large'
        }
    ];

    const colorPickerChildren = [
        {
            label: 'Dark',
            name: 'dark',
            color: 'bg-black'
        },
        {
            label: 'Light',
            name: 'light',
            color: 'bg-grey-50'
        },
        {
            label: 'Accent',
            name: 'accent',
            color: 'bg-accent'
        },
        {
            label: 'Background Image', // technically not a color, but it could have some styles associated with it when a background image is added.
            name: 'image',
            color: 'bg-grey-50'
        }
    ];

    const {isLoading: isUploading, progress} = fileUploader || {};

    return (
        <>
            <div className={`flex flex-col items-center justify-center text-center font-sans transition-colors ease-in-out ${(size === 'small') ? 'min-h-[40vh] p-[14vmin]' : (size === 'medium') ? 'min-h-[60vh] p-[12vmin]' : 'min-h-[80vh] p-[18vmin]'} ${HEADER_COLORS[type]} `}
                style={backgroundImageSrc && type === 'image' ? {
                    backgroundImage: `url(${backgroundImageSrc})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center center',
                    backgroundColor: 'bg-grey-950'
                } : null}>

                {/* Heading */}
                {
                    (isEditing || !!header || !isEditorEmpty(headerTextEditor)) && (
                        <KoenigNestedEditor
                            autoFocus={true}
                            focusNext={subheaderTextEditor}
                            hasSettingsPanel={true}
                            initialEditor={headerTextEditor}
                            initialEditorState={headerTextEditorInitialState}
                            nodes="minimal"
                            placeholderClassName={`truncate opacity-50 whitespace-normal !tracking-tight !text-center w-full !leading-tight !font-bold ${(size === 'small') ? 'kg-header-small !text-6xl' : (size === 'medium') ? '!text-7xl' : '!text-8xl'} ${HEADER_TEXT_COLORS[type]}`}
                            placeholderText={headerPlaceholder}
                            singleParagraph={true}
                            textClassName={`koenig-lexical-header-heading relative w-full whitespace-normal text-center font-bold text-center [&:has(br)]:text-left ${(size === 'small') ? 'koenig-lexical-header-small [&:has(br)]:pl-[calc(50%_-_254px)]' : (size === 'medium') ? 'koenig-lexical-header-medium [&:has(br)]:pl-[calc(50%_-_304px)]' : 'koenig-lexical-header-large [&:has(br)]:pl-[calc(50%_-_404px)]'} ${HEADER_TEXT_COLORS[type]}`}
                        />
                    )
                }

                {/* Subheading */}
                {
                    (isEditing || !!subheader || !isEditorEmpty(subheaderTextEditor)) && (
                        <KoenigNestedEditor
                            hasSettingsPanel={true}
                            initialEditor={subheaderTextEditor}
                            initialEditorState={subheaderTextEditorInitialState}
                            nodes="minimal"
                            placeholderClassName={`truncate opacity-50 w-full whitespace-normal !text-center !leading-tight !font-normal ${(size === 'small') ? '!text-xl' : (size === 'medium') ? '!text-2xl' : '!text-3xl'} ${HEADER_TEXT_COLORS[type]}`}
                            placeholderText={subheaderPlaceholder}
                            singleParagraph={true}
                            textClassName={`koenig-lexical-header-subheading relative w-full whitespace-normal text-center [&:has(br)]:text-left ${(size === 'small') ? 'koenig-lexical-header-small [&:has(br)]:pl-[calc(50%_-_105px)] !mt-2' : (size === 'medium') ? 'koenig-lexical-header-medium [&:has(br)]:pl-[calc(50%_-_124px)] !mt-3' : 'koenig-lexical-header-large [&:has(br)]:pl-[calc(50%_-_156px)] !mt-3'} ${HEADER_TEXT_COLORS[type]}`}
                        />
                    )
                }

                {/* Button */}
                { button ? 
                    <div className={`${(size === 'small') ? 'mt-6' : (size === 'medium') ? 'mt-8' : 'mt-10'}`}>
                        {((button && (type === 'light')) && <Button dataTestId="header-card-button" placeholder={buttonPlaceholder} size={size} value={buttonText} />) || (button && <Button color='light' dataTestId="header-card-button" placeholder={buttonPlaceholder} size={size} value={buttonText} />)}
                    </div>
                    : undefined
                }

                {/* Read-only overlay */}
                {!isEditing && <div className="absolute top-0 z-10 !m-0 h-full w-full cursor-default p-0"></div>}
            </div>

            {isEditing && (
                <SettingsPanel className="mt-0">
                    <ButtonGroupSetting
                        buttons={buttonGroupChildren}
                        label='Size'
                        selectedName={size}
                        onClick={handleSizeSelector}
                    />
                    <ColorPickerSetting
                        buttons={colorPickerChildren}
                        label='Style'
                        selectedName={type}
                        onClick={handleColorSelector}
                    />
                    <ImagePicker
                        backgroundImagePreview={backgroundImagePreview}
                        backgroundImageSrc={backgroundImageSrc}
                        fileInputRef={fileInputRef}
                        handleClearBackgroundImage={handleClearBackgroundImage}
                        isUploading={isUploading}
                        openFilePicker={openFilePicker}
                        progress={progress}
                        onFileChange={onFileChange}
                    />
                    <SettingsDivider />
                    <ToggleSetting
                        dataTestId='header-button-toggle'
                        isChecked={button}
                        label='Button'
                        onChange={handleButtonToggle}
                    />
                    {button ? (
                        <>
                            <InputSetting
                                dataTestId='header-button-text'
                                label='Button text'
                                placeholder='Add button text'
                                value={buttonText}
                                onChange={handleButtonText}

                            />
                            <InputUrlSetting
                                dataTestId='header-button-url'
                                label='Button URL'
                                value={buttonUrl}
                                onChange={handleButtonUrl}
                            />
                        </>
                    ) : null}
                </SettingsPanel>
            )}
        </>
    );
}

HeaderCard.propTypes = {
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    type: PropTypes.oneOf(['dark', 'light', 'accent', 'image']),
    heading: PropTypes.string,
    headerPlaceholder: PropTypes.string,
    subheader: PropTypes.string,
    subheaderPlaceholder: PropTypes.string,
    button: PropTypes.bool,
    buttonText: PropTypes.string,
    buttonPlaceholder: PropTypes.string,
    buttonUrl: PropTypes.string,
    backgroundImageSrc: PropTypes.string,
    backgroundImagePreview: PropTypes.bool,
    isEditing: PropTypes.bool,
    isUploading: PropTypes.bool,
    progress: PropTypes.number,
    fileUploader: PropTypes.object,
    header: PropTypes.string,
    fileInputRef: PropTypes.object,
    handleSizeSelector: PropTypes.func,
    handleColorSelector: PropTypes.func,
    handleButtonToggle: PropTypes.func,
    handleButtonText: PropTypes.func,
    handleButtonUrl: PropTypes.func,
    handleClearBackgroundImage: PropTypes.func,
    openFilePicker: PropTypes.func,
    onFileChange: PropTypes.func,
    headerTextEditor: PropTypes.object,
    headerTextEditorInitialState: PropTypes.string,
    subheaderTextEditor: PropTypes.object,
    subheaderTextEditorInitialState: PropTypes.string
};

FileUploading.propTypes = {
    progress: PropTypes.number
};

ImagePicker.propTypes = {
    backgroundImagePreview: PropTypes.bool,
    backgroundImageSrc: PropTypes.string,
    fileInputRef: PropTypes.object,
    handleClearBackgroundImage: PropTypes.func,
    isUploading: PropTypes.bool,
    openFilePicker: PropTypes.func,
    progress: PropTypes.number,
    onFileChange: PropTypes.func
};