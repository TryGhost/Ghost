import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {ButtonGroupSetting, ColorPickerSetting, InputSetting, MediaUploadSetting, MultiSelectDropdownSetting, SettingsDivider, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {ReactComponent as CenterAlignIcon} from '../../../assets/icons/kg-align-center.svg';
import {ReactComponent as ImgFullIcon} from '../../../assets/icons/kg-img-full.svg';
import {ReactComponent as ImgRegularIcon} from '../../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImgWideIcon} from '../../../assets/icons/kg-img-wide.svg';
import {ReactComponent as LeftAlignIcon} from '../../../assets/icons/kg-align-left.svg';
import {SubscribeForm} from '../SubscribeForm';
import {getAccentColor} from '../../../utils/getAccentColor';
import {isEditorEmpty} from '../../../utils/isEditorEmpty';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

export function SignupCard({alignment,
    splitLayout,
    header,
    headerPlaceholder,
    subheader,
    subheaderPlaceholder,
    disclaimer,
    disclaimerPlaceholder,
    buttonText,
    showBackgroundImage,
    backgroundImageSrc,
    backgroundImageAverageColor,
    backgroundColor,
    buttonColor,
    isEditing,
    fileUploader,
    handleAlignment,
    handleButtonText,
    handleToggleBackgroundImage,
    handleClearBackgroundImage,
    handleBackgroundColor,
    handleButtonColor,
    handleLayout,
    labels,
    layout,
    availableLabels,
    handleLabels,
    onFileChange,
    imageDragHandler,
    headerTextEditor,
    headerTextEditorInitialState,
    subheaderTextEditor,
    subheaderTextEditorInitialState,
    disclaimerTextEditor,
    disclaimerTextEditorInitialState}) {
    const layoutChildren = [
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
        },
        {
            label: 'Split',
            name: 'split',
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

    const {isLoading: isUploading, progress} = fileUploader || {};

    const hexColorValue = (color) => {
        if (color === 'accent') {
            return getAccentColor();
        }

        return color;
    };

    const wrapperStyle = () => {
        if (backgroundImageSrc) {
            return {
                backgroundImage: `url(${backgroundImageSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundColor: 'bg-grey-950',
                color: backgroundImageAverageColor && textColorForBackgroundColor(backgroundImageAverageColor).hex()
            };
        } else if (backgroundColor) {
            return {
                backgroundColor: hexColorValue(backgroundColor),
                color: textColorForBackgroundColor(hexColorValue(backgroundColor)).hex()
            };
        }

        return null;
    };

    return (
        <>
            <div className={`flex flex-col justify-center bg-transparent font-sans text-black transition-colors ease-in-out dark:text-white ${(alignment === 'center' && 'items-center')} ${(layout === 'regular') ? 'min-h-[32vh] p-[8vmin] pb-[9vmin]' : (layout === 'wide') ? 'min-h-[56vh] p-[12vmin] pb-[13vmin]' : 'min-h-[80vh] p-[16vmin] pb-[18vmin]'}`} data-testid={'signup-card-container'} style={wrapperStyle()}>
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
                            placeholderClassName={`truncate opacity-50 whitespace-normal !tracking-tight w-full !leading-tight !font-bold ${(alignment === 'center' && 'text-center')} ${(layout === 'regular') ? '!text-5xl' : (layout === 'wide') ? '!text-6xl' : '!text-8xl'}`}
                            placeholderText={headerPlaceholder}
                            singleParagraph={true}
                            textClassName={`koenig-lexical-header-heading relative w-full whitespace-normal font-bold ${(alignment === 'center' && 'text-center')} [&:has(br)]:text-left ${(layout === 'regular') ? `koenig-lexical-header-xsmall ${(alignment === 'center') ? '[&:has(br)]:pl-[calc(50%_-_192px)]' : ''}` : (layout === 'wide') ? `koenig-lexical-header-small ${(alignment === 'center') ? '[&:has(br)]:pl-[calc(50%_-_238px)]' : ''}` : `koenig-lexical-header-large ${(alignment === 'center') ? '[&:has(br)]:pl-[calc(50%_-_374px)]' : ''}`}`}
                        />
                    )
                }

                {/* Subheading */}
                {
                    (isEditing || !!subheader || !isEditorEmpty(subheaderTextEditor)) && (
                        <KoenigNestedEditor
                            focusNext={disclaimerTextEditor}
                            hasSettingsPanel={true}
                            initialEditor={subheaderTextEditor}
                            initialEditorState={subheaderTextEditorInitialState}
                            nodes="minimal"
                            placeholderClassName={`truncate opacity-50 w-full whitespace-normal !leading-tight !font-normal ${(alignment === 'center' && 'text-center')} ${(layout === 'regular') ? '!text-xl' : (layout === 'wide') ? '!text-2xl' : '!text-3xl'}`}
                            placeholderText={subheaderPlaceholder}
                            singleParagraph={true}
                            textClassName={`koenig-lexical-header-subheading relative w-full whitespace-normal ${(alignment === 'center' && 'text-center')} [&:has(br)]:text-left ${(layout === 'regular') ? `koenig-lexical-header-small !mt-2 ${(alignment === 'center') ? '[&:has(br)]:pl-[calc(50%_-_105px)]' : ''}` : (layout === 'wide') ? `koenig-lexical-header-medium !mt-3 ${(alignment === 'center') ? '[&:has(br)]:pl-[calc(50%_-_124px)]' : ''}` : `koenig-lexical-header-large !mt-3 ${(alignment === 'center') ? '[&:has(br)]:pl-[calc(50%_-_156px)]' : ''}`}`}
                        />
                    )
                }

                {/* Subscribe form */}
                <div className={`h-full ${(layout === 'regular') ? 'mt-6 w-9/12' : (layout === 'wide') ? 'mt-8 w-4/6' : 'mt-10 w-5/12'}`}>
                    <SubscribeForm
                        buttonSize={`${(layout === 'regular') ? 'medium' : (layout === 'wide') ? 'large' : 'xlarge'}`}
                        buttonStyle={buttonColor ? {
                            backgroundColor: hexColorValue(buttonColor),
                            color: textColorForBackgroundColor(hexColorValue(buttonColor)).hex()
                        } : {backgroundColor: `#000000`,
                            color: `#ffffff`}}
                        buttonText={buttonText || 'Subscribe'}
                        dataTestId='signup-card-button'
                        disabled={true}
                        inputBorderStyle={buttonColor ? {
                            border: `1px solid ${hexColorValue(buttonColor)}`
                        } : null}
                        placeholder='yourname@example.com'
                    />
                </div>

                {/* Disclaimer */}
                {
                    (isEditing || !!disclaimer || !isEditorEmpty(disclaimerTextEditor)) && (
                        <KoenigNestedEditor
                            hasSettingsPanel={true}
                            initialEditor={disclaimerTextEditor}
                            initialEditorState={disclaimerTextEditorInitialState}
                            nodes="minimal"
                            placeholderClassName={`truncate opacity-50 w-full whitespace-normal !leading-tight !font-normal !text-[1.6rem] !tracking-[-0.025em] ${(alignment === 'center' && 'text-center')}`}
                            placeholderText={disclaimerPlaceholder}
                            singleParagraph={true}
                            textClassName={`koenig-lexical-header-subheading koenig-lexical-header-xsmall relative w-full whitespace-normal !mt-4 ${(alignment === 'center' && 'text-center')} [&:has(br)]:text-left ${(alignment === 'center') && '[&:has(br)]:pl-[calc(50%_-_76px)]'}`}
                        />
                    )
                }

                {/* Read-only overlay */}
                {!isEditing && <div className="absolute top-0 z-10 !m-0 h-full w-full cursor-default p-0"></div>}
            </div>

            {isEditing && (
                <SettingsPanel className="mt-0">
                    <ButtonGroupSetting
                        buttons={layoutChildren}
                        label='Layout'
                        selectedName={layout}
                        onClick={handleLayout}
                    />
                    <ButtonGroupSetting
                        buttons={alignmentChildren}
                        label='Alignment'
                        selectedName={alignment}
                        onClick={handleAlignment}
                    />
                    <ToggleSetting
                        dataTestId='signup-background-image-toggle'
                        isChecked={Boolean(showBackgroundImage)}
                        label='Image'
                        onChange={handleToggleBackgroundImage}
                    />
                    {showBackgroundImage && <MediaUploadSetting
                        alt='Background image'
                        errors={fileUploader.errors}
                        icon='file'
                        isDraggedOver={imageDragHandler.isDraggedOver}
                        isLoading={isUploading}
                        label='Custom thumbnail'
                        mimeTypes={['image/*']}
                        placeholderRef={imageDragHandler.setRef}
                        progress={progress}
                        size='xsmall'
                        src={backgroundImageSrc}
                        hideLabel
                        onFileChange={onFileChange}
                        onRemoveMedia={handleClearBackgroundImage}
                    />}
                    {(!showBackgroundImage || splitLayout) && <ColorPickerSetting
                        dataTestId='signup-background-color'
                        label='Background'
                        swatches={[
                            {title: 'Brand color', accent: true},
                            {title: 'Black', hex: '#000000'},
                            {title: 'Transparent', transparent: true}
                        ]}
                        value={backgroundColor}
                        onChange={handleBackgroundColor}
                    />}
                    <SettingsDivider />

                    <ColorPickerSetting
                        dataTestId='signup-button-color'
                        label='Button'
                        swatches={[
                            {title: 'Brand color', accent: true},
                            {title: 'Black', hex: '#000000'},
                            {title: 'White', hex: '#ffffff'}
                        ]}
                        value={buttonColor}
                        onChange={handleButtonColor}
                    />
                    <InputSetting
                        dataTestId='signup-button-text'
                        label='Button text'
                        placeholder='Add button text'
                        value={buttonText || 'Subscribe'}
                        hideLabel
                        onChange={handleButtonText}
                    />
                    <MultiSelectDropdownSetting
                        dataTestId='labels-dropdown'
                        description='These labels will be applied to members who sign up via this form.'
                        label='Labels'
                        menu={availableLabels}
                        value={labels}
                        onChange={handleLabels}
                    />
                </SettingsPanel>
            )}
        </>
    );
}

SignupCard.propTypes = {
    alignment: PropTypes.oneOf(['left', 'center']),
    splitLayout: PropTypes.bool,
    header: PropTypes.string,
    headerPlaceholder: PropTypes.string,
    subheader: PropTypes.string,
    subheaderPlaceholder: PropTypes.string,
    disclaimer: PropTypes.string,
    disclaimerPlaceholder: PropTypes.string,
    buttonText: PropTypes.string,
    buttonPlaceholder: PropTypes.string,
    backgroundImageSrc: PropTypes.string,
    backgroundImageAverageColor: PropTypes.string,
    backgroundColor: PropTypes.string,
    buttonColor: PropTypes.string,
    showBackgroundImage: PropTypes.bool,
    isEditing: PropTypes.bool,
    fileUploader: PropTypes.object,
    fileInputRef: PropTypes.object,
    handleLayout: PropTypes.func,
    handleAlignment: PropTypes.func,
    handleButtonText: PropTypes.func,
    handleClearBackgroundImage: PropTypes.func,
    handleBackgroundColor: PropTypes.func,
    handleToggleBackgroundImage: PropTypes.func,
    handleButtonColor: PropTypes.func,
    handleLabels: PropTypes.func,
    labels: PropTypes.arrayOf(PropTypes.string),
    layout: PropTypes.oneOf(['regular', 'wide', 'full', 'split']),
    availableLabels: PropTypes.arrayOf(PropTypes.object),
    openFilePicker: PropTypes.func,
    onFileChange: PropTypes.func,
    imageDragHandler: PropTypes.object,
    headerTextEditor: PropTypes.object,
    headerTextEditorInitialState: PropTypes.string,
    subheaderTextEditor: PropTypes.object,
    subheaderTextEditorInitialState: PropTypes.string,
    disclaimerTextEditor: PropTypes.object,
    disclaimerTextEditorInitialState: PropTypes.string
};
