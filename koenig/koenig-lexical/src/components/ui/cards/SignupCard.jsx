import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {Button} from '../Button';
import {ButtonGroupSetting, ColorPickerSetting, DropdownSetting, InputSetting, SettingsDivider, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {ReactComponent as CenterAlignIcon} from '../../../assets/icons/kg-align-center.svg';
import {ReactComponent as FileUploadIcon} from '../../../assets/icons/kg-upload-fill.svg';
import {ReactComponent as ImgFullIcon} from '../../../assets/icons/kg-img-full.svg';
import {ReactComponent as ImgRegularIcon} from '../../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImgWideIcon} from '../../../assets/icons/kg-img-wide.svg';
import {Input} from '../Input';
import {ReactComponent as LeftAlignIcon} from '../../../assets/icons/kg-align-left.svg';
import {ProgressBar} from '../ProgressBar';
import {ReactComponent as TrashIcon} from '../../../assets/icons/kg-trash.svg';
import {isEditorEmpty} from '../../../utils/isEditorEmpty';

export const BACKGROUND_COLORS = {
    dark: 'bg-black',
    light: 'bg-grey-100',
    accent: 'bg-accent',
    image: 'bg-grey-300 dark:bg-grey-950 bg-gradient-to-t from-black/0 via-black/5 to-black/30'
};

export const TEXT_COLORS = {
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
        </>
    );
}

export function SignupCard({isEditing,
    cardWidth,
    headerPlaceholder,
    subheaderPlaceholder,
    subheader,
    buttonText,
    buttonPlaceholder,
    splitLayout,
    alignment,
    handleColorSelector,
    handleSizeSelector,
    handleButtonText,
    backgroundImageSrc,
    onFileChange,
    handleClearBackgroundImage,
    fileInputRef,
    openFilePicker,
    type,
    header,
    headerTextEditor,
    subheaderTextEditor,
    fileUploader,
    headerTextEditorInitialState,
    subheaderTextEditorInitialState}) {
    const cardWidthChildren = [
        {
            label: 'Regular',
            name: 'regular',
            Icon: ImgRegularIcon
        },
        {
            label: 'Wide',
            name: 'wide',
            Icon: ImgWideIcon
        },
        {
            label: 'Full',
            name: 'full',
            Icon: ImgFullIcon
        }
    ];

    const alignmentChildren = [
        {
            label: 'Left',
            name: 'left',
            Icon: LeftAlignIcon
        },
        {
            label: 'Center',
            name: 'center',
            Icon: CenterAlignIcon
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

    const dropdownOptions = [{
        label: 'Label 1'
    }, {
        label: 'Label 2'
    }];

    const {isLoading: isUploading, progress} = fileUploader || {};

    return (
        <>
            <div className={`flex flex-col justify-center font-sans transition-colors ease-in-out ${(alignment === 'center' && 'items-center')} ${(cardWidth === 'regular') ? 'min-h-[40vh] p-[14vmin]' : (cardWidth === 'wide') ? 'min-h-[60vh] p-[12vmin]' : 'min-h-[80vh] p-[18vmin]'} ${BACKGROUND_COLORS[type]} `}
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
                            placeholderClassName={`truncate opacity-50 whitespace-normal !tracking-tight w-full !leading-tight !font-bold ${(alignment === 'center' && 'text-center')} ${(cardWidth === 'regular') ? 'kg-header-small !text-6xl' : (cardWidth === 'wide') ? '!text-7xl' : '!text-8xl'} ${TEXT_COLORS[type]}`}
                            placeholderText={headerPlaceholder}
                            singleParagraph={true}
                            textClassName={`koenig-lexical-header-heading relative w-full whitespace-normal font-bold ${(alignment === 'center' && 'text-center')} [&:has(br)]:text-left ${(cardWidth === 'regular') ? 'koenig-lexical-header-small [&:has(br)]:pl-[calc(50%_-_254px)]' : (cardWidth === 'wide') ? 'koenig-lexical-header-medium [&:has(br)]:pl-[calc(50%_-_304px)]' : 'koenig-lexical-header-large [&:has(br)]:pl-[calc(50%_-_404px)]'} ${TEXT_COLORS[type]}`}
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
                            placeholderClassName={`truncate opacity-50 w-full whitespace-normal !leading-tight !font-normal ${(alignment === 'center' && 'text-center')} ${(cardWidth === 'regular') ? '!text-xl' : (cardWidth === 'wide') ? '!text-2xl' : '!text-3xl'} ${TEXT_COLORS[type]}`}
                            placeholderText={subheaderPlaceholder}
                            singleParagraph={true}
                            textClassName={`koenig-lexical-header-subheading relative w-full whitespace-normal ${(alignment === 'center' && 'text-center')} [&:has(br)]:text-left ${(cardWidth === 'regular') ? 'koenig-lexical-header-small [&:has(br)]:pl-[calc(50%_-_105px)] !mt-2' : (cardWidth === 'wide') ? 'koenig-lexical-header-medium [&:has(br)]:pl-[calc(50%_-_124px)] !mt-3' : 'koenig-lexical-header-large [&:has(br)]:pl-[calc(50%_-_156px)] !mt-3'} ${TEXT_COLORS[type]}`}
                        />
                    )
                }

                {/* Subscribe field */}
                <div className={`${(cardWidth === 'regular') ? 'mt-6' : (cardWidth === 'wide') ? 'mt-8' : 'mt-10'}`}>
                    <Input placeholder='jamie@example.com' />
                    {((type === 'light') && <Button dataTestId="header-card-button" placeholder={buttonPlaceholder} size='medium' value={buttonText} />) || <Button color='light' dataTestId="header-card-button" placeholder={buttonPlaceholder} size='medium' value={buttonText} />}
                </div>

                {/* Read-only overlay */}
                {!isEditing && <div className="absolute top-0 z-10 !m-0 h-full w-full cursor-default p-0"></div>}   
            </div>

            {isEditing && (
                <SettingsPanel className="mt-0">
                    <ButtonGroupSetting
                        buttons={cardWidthChildren}
                        label='Width'
                        selectedName={cardWidth}
                        onClick={handleSizeSelector}
                    />
                    <ButtonGroupSetting
                        buttons={alignmentChildren}
                        label='Alignment'
                        selectedName={alignment}
                        onClick={handleSizeSelector}
                    />
                    <ToggleSetting
                        dataTestId='split-layout-toggle'
                        isChecked={splitLayout}
                        label='Split layout'
                    />
                    {splitLayout ?
                        <ImagePicker
                            backgroundImageSrc={backgroundImageSrc}
                            fileInputRef={fileInputRef}
                            handleClearBackgroundImage={handleClearBackgroundImage}
                            isUploading={isUploading}
                            openFilePicker={openFilePicker}
                            progress={progress}
                            onFileChange={onFileChange}
                        />
                        : <>
                            <ColorPickerSetting
                                buttons={colorPickerChildren}
                                label='Background'
                                selectedName={type}
                                onClick={handleColorSelector}
                            />
                            {(type === 'image') &&
                            <ImagePicker
                                backgroundImageSrc={backgroundImageSrc}
                                fileInputRef={fileInputRef}
                                handleClearBackgroundImage={handleClearBackgroundImage}
                                isUploading={isUploading}
                                openFilePicker={openFilePicker}
                                progress={progress}
                                onFileChange={onFileChange}
                            />
                            }
                        </>
                    }
                    <SettingsDivider />

                    <InputSetting
                        dataTestId='header-button-text'
                        label='Button text'
                        placeholder='Add button text'
                        value={buttonText}
                        onChange={handleButtonText}

                    />
                    <DropdownSetting
                        description='These labels will be applied to members who sign up via this form.'
                        label='Labels'
                        menu={dropdownOptions}
                    />

                </SettingsPanel>
            )}
        </>
    );
}

SignupCard.propTypes = {
    cardWidth: PropTypes.oneOf(['regular', 'wide', 'full']),
    alignment: PropTypes.oneOf(['left', 'center']),
    type: PropTypes.oneOf(['dark', 'light', 'accent', 'image']),
    heading: PropTypes.string,
    headerPlaceholder: PropTypes.string,
    subheader: PropTypes.string,
    subheaderPlaceholder: PropTypes.string,
    buttonText: PropTypes.string,
    buttonPlaceholder: PropTypes.string,
    splitLayout: PropTypes.bool
};
