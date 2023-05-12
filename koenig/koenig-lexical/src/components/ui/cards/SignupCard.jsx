import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {Button} from '../Button';
import {ButtonGroupSetting, ColorPickerSetting, InputSetting, MediaUploadSetting, MultiSelectDropdownSetting, SettingsDivider, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {ReactComponent as CenterAlignIcon} from '../../../assets/icons/kg-align-center.svg';
import {ReactComponent as ImgFullIcon} from '../../../assets/icons/kg-img-full.svg';
import {ReactComponent as ImgRegularIcon} from '../../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImgWideIcon} from '../../../assets/icons/kg-img-wide.svg';
import {Input} from '../Input';
import {ReactComponent as LeftAlignIcon} from '../../../assets/icons/kg-align-left.svg';
import {isEditorEmpty} from '../../../utils/isEditorEmpty';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

export function SignupCard({alignment,
    cardWidth,
    handleSizeSelector,
    splitLayout,
    header,
    headerPlaceholder,
    subheader,
    subheaderPlaceholder,
    disclaimer,
    disclaimerPlaceholder,
    buttonText,
    buttonPlaceholder,
    showBackgroundImage,
    backgroundImageSrc,
    backgroundColor,
    buttonColor,
    isEditing,
    fileUploader,
    handleButtonText,
    handleToggleBackgroundImage,
    handleClearBackgroundImage,
    handleBackgroundColor,
    handleButtonColor,
    labels,
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

    const {isLoading: isUploading, progress} = fileUploader || {};

    const wrapperStyle = () => {
        if (backgroundImageSrc) {
            return {
                backgroundImage: `url(${backgroundImageSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundColor: 'bg-grey-950'
            };
        } else if (backgroundColor) {
            return {
                backgroundColor: backgroundColor,
                color: textColorForBackgroundColor(backgroundColor).hex()
            };
        }

        return null;
    };

    return (
        <>
            <div className={`flex flex-col justify-center bg-black font-sans text-white transition-colors ease-in-out ${(alignment === 'center' && 'items-center')} ${(cardWidth === 'regular') ? 'min-h-[40vh] p-[14vmin]' : (cardWidth === 'wide') ? 'min-h-[60vh] p-[12vmin]' : 'min-h-[80vh] p-[18vmin]'}`} style={wrapperStyle()}>
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
                            placeholderClassName={`truncate opacity-50 whitespace-normal !tracking-tight w-full !leading-tight !font-bold ${(alignment === 'center' && 'text-center')} ${(cardWidth === 'regular') ? 'kg-header-small !text-6xl' : (cardWidth === 'wide') ? '!text-7xl' : '!text-8xl'}`}
                            placeholderText={headerPlaceholder}
                            singleParagraph={true}
                            textClassName={`koenig-lexical-header-heading relative w-full whitespace-normal font-bold ${(alignment === 'center' && 'text-center')} [&:has(br)]:text-left ${(cardWidth === 'regular') ? 'koenig-lexical-header-small [&:has(br)]:pl-[calc(50%_-_254px)]' : (cardWidth === 'wide') ? 'koenig-lexical-header-medium [&:has(br)]:pl-[calc(50%_-_304px)]' : 'koenig-lexical-header-large [&:has(br)]:pl-[calc(50%_-_404px)]'}`}
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
                            placeholderClassName={`truncate opacity-50 w-full whitespace-normal !leading-tight !font-normal ${(alignment === 'center' && 'text-center')} ${(cardWidth === 'regular') ? '!text-xl' : (cardWidth === 'wide') ? '!text-2xl' : '!text-3xl'}`}
                            placeholderText={subheaderPlaceholder}
                            singleParagraph={true}
                            textClassName={`koenig-lexical-header-subheading relative w-full whitespace-normal ${(alignment === 'center' && 'text-center')} [&:has(br)]:text-left ${(cardWidth === 'regular') ? 'koenig-lexical-header-small [&:has(br)]:pl-[calc(50%_-_105px)] !mt-2' : (cardWidth === 'wide') ? 'koenig-lexical-header-medium [&:has(br)]:pl-[calc(50%_-_124px)] !mt-3' : 'koenig-lexical-header-large [&:has(br)]:pl-[calc(50%_-_156px)] !mt-3'}`}
                        />
                    )
                }

                {/* Subscribe field */}
                <div className={`${(cardWidth === 'regular') ? 'mt-6' : (cardWidth === 'wide') ? 'mt-8' : 'mt-10'}`}>
                    <Input placeholder='jamie@example.com' />
                    <Button
                        color='light'
                        dataTestId="signup-card-button"
                        placeholder={buttonPlaceholder}
                        size='medium'
                        style={buttonColor ? {
                            backgroundColor: buttonColor,
                            color: textColorForBackgroundColor(buttonColor).hex()
                        } : null}
                        value={buttonText}
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
                            placeholderClassName={`truncate opacity-50 w-full whitespace-normal !leading-tight !font-normal ${(alignment === 'center' && 'text-center')} ${(cardWidth === 'regular') ? '!text-xl' : (cardWidth === 'wide') ? '!text-2xl' : '!text-3xl'}`}
                            placeholderText={disclaimerPlaceholder}
                            singleParagraph={true}
                            textClassName={`koenig-lexical-header-subheading relative w-full whitespace-normal ${(alignment === 'center' && 'text-center')} [&:has(br)]:text-left ${(cardWidth === 'regular') ? 'koenig-lexical-header-small [&:has(br)]:pl-[calc(50%_-_105px)] !mt-2' : (cardWidth === 'wide') ? 'koenig-lexical-header-medium [&:has(br)]:pl-[calc(50%_-_124px)] !mt-3' : 'koenig-lexical-header-large [&:has(br)]:pl-[calc(50%_-_156px)] !mt-3'}`}
                        />
                    )
                }

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
                        value={backgroundColor}
                        onChange={handleBackgroundColor}
                    />}
                    <SettingsDivider />

                    <ColorPickerSetting
                        dataTestId='signup-button-color'
                        label='Button'
                        value={buttonColor}
                        onChange={handleButtonColor}
                    />
                    <InputSetting
                        dataTestId='signup-button-text'
                        label='Button text'
                        placeholder='Add button text'
                        value={buttonText}
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
    cardWidth: PropTypes.oneOf(['regular', 'wide', 'full']),
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
    backgroundColor: PropTypes.string,
    buttonColor: PropTypes.string,
    showBackgroundImage: PropTypes.bool,
    isEditing: PropTypes.bool,
    fileUploader: PropTypes.object,
    fileInputRef: PropTypes.object,
    handleSizeSelector: PropTypes.func,
    handleButtonText: PropTypes.func,
    handleClearBackgroundImage: PropTypes.func,
    handleBackgroundColor: PropTypes.func,
    handleToggleBackgroundImage: PropTypes.func,
    handleButtonColor: PropTypes.func,
    handleLabels: PropTypes.func,
    labels: PropTypes.arrayOf(PropTypes.string),
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
