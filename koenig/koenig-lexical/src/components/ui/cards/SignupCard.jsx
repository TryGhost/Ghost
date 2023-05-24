import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React, {useEffect} from 'react';
import clsx from 'clsx';
import {ButtonGroupSetting, ColorPickerSetting, InputSetting, MediaUploadSetting, MultiSelectDropdownSetting, SettingsDivider, SettingsPanel} from '../SettingsPanel';
import {ReactComponent as CenterAlignIcon} from '../../../assets/icons/kg-align-center.svg';
import {FastAverageColor} from 'fast-average-color';
import {IconButton} from '../IconButton';
import {ReactComponent as ImgBgIcon} from '../../../assets/icons/kg-img-bg.svg';
import {ReactComponent as ImgFullIcon} from '../../../assets/icons/kg-img-full.svg';
import {ReactComponent as ImgRegularIcon} from '../../../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImgWideIcon} from '../../../assets/icons/kg-img-wide.svg';
import {ReactComponent as LayoutSplitIcon} from '../../../assets/icons/kg-layout-split.svg';
import {ReactComponent as LeftAlignIcon} from '../../../assets/icons/kg-align-left.svg';
import {MediaUploader} from '../MediaUploader';
import {SubscribeForm} from '../SubscribeForm';
import {ReactComponent as SwapIcon} from '../../../assets/icons/kg-swap.svg';
import {getAccentColor} from '../../../utils/getAccentColor';
import {isEditorEmpty} from '../../../utils/isEditorEmpty';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

export function SignupCard({alignment,
    header,
    subheader,
    disclaimer,
    buttonText,
    showBackgroundImage,
    backgroundImageSrc,
    backgroundColor,
    buttonColor,
    buttonTextColor,
    textColor,
    successMessage,
    isEditing,
    fileUploader,
    handleAlignment,
    handleButtonText,
    handleShowBackgroundImage,
    handleClearBackgroundImage,
    handleBackgroundColor,
    handleButtonColor,
    handleLayout,
    handleTextColor,
    handleSuccessMessage,
    isPinturaEnabled,
    labels,
    layout,
    availableLabels,
    handleLabels,
    onFileChange,
    openImageEditor,
    imageDragHandler,
    headerTextEditor,
    headerTextEditorInitialState,
    subheaderTextEditor,
    subheaderTextEditorInitialState,
    disclaimerTextEditor,
    disclaimerTextEditorInitialState,
    isSwapped,
    handleSwapLayout}) {
    const matchingTextColor = (color) => {
        return color === 'transparent' ? '' : textColorForBackgroundColor(hexColorValue(color)).hex();
    };

    useEffect(() => {
        if (backgroundImageSrc && layout !== 'split') {
            new FastAverageColor().getColorAsync(backgroundImageSrc).then((color) => {
                handleTextColor(matchingTextColor(color.hex));
            });
        }
        // This is only needed when the background image is changed
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backgroundImageSrc]);

    const layoutChildren = [
        {
            label: 'Regular',
            name: 'regular',
            Icon: ImgRegularIcon,
            dataTestId: 'signup-layout-regular'
        },
        {
            label: 'Wide',
            name: 'wide',
            Icon: ImgWideIcon,
            dataTestId: 'signup-layout-wide'
        },
        {
            label: 'Full',
            name: 'full',
            Icon: ImgFullIcon,
            dataTestId: 'signup-layout-full'
        },
        {
            label: 'Split',
            name: 'split',
            Icon: LayoutSplitIcon,
            dataTestId: 'signup-layout-split'
        }
    ];

    const alignmentChildren = [
        {
            label: 'Left',
            name: 'left',
            Icon: LeftAlignIcon,
            dataTestId: 'signup-alignment-left'
        },
        {
            label: 'Center',
            name: 'center',
            Icon: CenterAlignIcon,
            dataTestId: 'signup-alignment-center'
        }
    ];

    const {isLoading, progress} = fileUploader || {};

    const headerPlaceholder = layout === 'split' ? 'Heading' : 'Enter heading text';
    const subheaderPlaceholder = layout === 'split' ? 'Subheading text' : 'Enter subheading text';
    const disclaimerPlaceholder = layout === 'split' ? 'Disclaimer text' : 'Enter disclaimer text';

    const hexColorValue = (color) => {
        return color === 'accent' ? getAccentColor() : color;
    };

    const wrapperStyle = () => {
        if (backgroundImageSrc && layout !== 'split' && textColor) {
            return {
                backgroundImage: `url(${backgroundImageSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundColor: 'bg-grey-950',
                color: hexColorValue(textColor)
            };
        } else if (backgroundColor && textColor) {
            return {
                backgroundColor: hexColorValue(backgroundColor),
                color: hexColorValue(textColor)
            };
        }

        return null;
    };

    return (
        <>
            <div className={clsx(
                'flex flex-col font-sans text-black transition-colors ease-in-out sm:flex-row',
                (layout === 'split' && isSwapped) && 'sm:flex-row-reverse'
            )} data-testid={'signup-card-container'} style={wrapperStyle()}>
                {layout === 'split' && (
                    <MediaUploader
                        additionalActions={<IconButton dataTestId="media-upload-swap" Icon={SwapIcon} onClick={handleSwapLayout} />}
                        alt='Background image'
                        className="sm:w-1/2"
                        desc='Click to select an image'
                        dragHandler={imageDragHandler}
                        errors={fileUploader?.errors}
                        icon='image'
                        imgClassName="aspect-[3/2]"
                        isLoading={isLoading}
                        isPinturaEnabled={isPinturaEnabled}
                        mimeTypes={['image/*']}
                        openImageEditor={openImageEditor}
                        progress={progress}
                        size='large'
                        src={backgroundImageSrc}
                        onFileChange={onFileChange}
                        onRemoveMedia={handleClearBackgroundImage}
                    />
                )}

                <div
                    className={clsx(
                        'mx-auto flex w-full flex-1 flex-col justify-center',
                        (alignment === 'center') && 'items-center',
                        (layout === 'regular') && 'py-[8rem] px-[6rem] lg:px-[8rem]',
                        (layout === 'wide') && 'max-w-[740px] py-[10rem] px-[8rem] lg:px-0',
                        (layout === 'full') && 'py-[8rem] px-[4.8rem] md:py-[12rem] md:px-[8rem] lg:p-[14rem] xl:p-[16rem]',
                        (layout === 'split') && 'px-[4.8rem] py-[8rem] md:py-[12rem] lg:px-[6rem] lg:py-[16rem]'
                    )}>
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
                                placeholderClassName={clsx(
                                    'h-[110%] w-full truncate whitespace-normal !font-bold !leading-[1.1] !tracking-tight opacity-50',
                                    (alignment === 'center') && 'text-center',
                                    (layout === 'regular') && 'text-3xl sm:text-4xl md:text-5xl',
                                    (layout === 'wide') && 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
                                    (layout === 'full' || layout === 'split') && 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl'
                                )}
                                placeholderText={headerPlaceholder}
                                singleParagraph={true}
                                textClassName={clsx(
                                    'koenig-lexical-header-heading peer relative w-full whitespace-normal font-bold caret-current [&:has(br)]:text-left',
                                    (alignment === 'center') && 'text-center',
                                    (layout === 'regular') && 'koenig-lexical-header-xsmall',
                                    (layout === 'regular' && alignment === 'center') && '[&:has(br)]:pl-[calc(50%_-_128px)] [&:has(br)]:sm:pl-[calc(50%_-_154px)] [&:has(br)]:md:pl-[calc(50%_-_204px)]',
                                    (layout === 'wide' || layout === 'split') && 'koenig-lexical-header-small',
                                    (layout === 'wide' && alignment === 'center') && '[&:has(br)]:pl-[calc(50%_-_128px)] [&:has(br)]:sm:pl-[calc(50%_-_154px)] [&:has(br)]:md:pl-[calc(50%_-_204px)] [&:has(br)]:lg:pl-[calc(50%_-_254px)]',
                                    (layout === 'full' || layout === 'split') && 'koenig-lexical-header-large',
                                    (layout === 'full' && alignment === 'center') && '[&:has(br)]:pl-[calc(50%_-_154px)] [&:has(br)]:sm:pl-[calc(50%_-_204px)] [&:has(br)]:md:pl-[calc(50%_-_254px)] [&:has(br)]:lg:pl-[calc(50%_-_306px)] [&:has(br)]:xl:pl-[calc(50%_-_408px)]',
                                    (layout === 'split' && alignment === 'center') && '[&:has(br)]:pl-[calc(50%_-_71px)] [&:has(br)]:sm:pl-[calc(50%_-_94px)] [&:has(br)]:md:pl-[calc(50%_-_116px)] [&:has(br)]:lg:pl-[calc(50%_-_140px)] [&:has(br)]:xl:pl-[calc(50%_-_186px)]'
                                )}
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
                                placeholderClassName={clsx(
                                    'h-[110%] w-full truncate whitespace-normal !font-medium !leading-snug !tracking-tight opacity-50',
                                    (alignment === 'center') && 'text-center',
                                    (layout === 'regular') && 'text-lg sm:text-xl',
                                    (layout === 'wide') && 'text-lg sm:text-xl md:text-2xl',
                                    (layout === 'full' || layout === 'split') && 'text-xl md:text-2xl xl:text-3xl'
                                )}
                                placeholderText={subheaderPlaceholder}
                                singleParagraph={true}
                                textClassName={clsx(
                                    'koenig-lexical-header-subheading peer relative w-full whitespace-normal caret-current [&:has(br)]:text-left',
                                    (alignment === 'center') && 'text-center',
                                    (layout === 'regular') && 'koenig-lexical-header-small !mt-2',
                                    (layout === 'regular' && alignment === 'center') && '[&:has(br)]:pl-[calc(50%_-_90px)] [&:has(br)]:sm:pl-[calc(50%_-_100px)]',
                                    (layout === 'wide') && 'koenig-lexical-header-medium !mt-3',
                                    (layout === 'wide' && alignment === 'center') && '[&:has(br)]:pl-[calc(50%_-_90px)] [&:has(br)]:sm:pl-[calc(50%_-_100px)] [&:has(br)]:md:pl-[calc(50%_-_120px)]',
                                    (layout === 'full' || layout === 'split') && 'koenig-lexical-header-large !mt-3',
                                    (layout === 'full' && alignment === 'center') && '[&:has(br)]:pl-[calc(50%_-_100px)] [&:has(br)]:md:pl-[calc(50%_-_120px)] [&:has(br)]:xl:pl-[calc(50%_-_152px)]',
                                    (layout === 'split' && alignment === 'center') && '[&:has(br)]:pl-[calc(50%_-_75px)] [&:has(br)]:md:pl-[calc(50%_-_90px)] [&:has(br)]:xl:pl-[calc(50%_-_112px)]'
                                )}
                            />
                        )
                    }

                    {/* Subscribe form */}
                    <div className={`w-full ${(layout === 'regular') ? 'peer-[.koenig-lexical]:mt-10' : (layout === 'wide') ? 'peer-[.koenig-lexical]:mt-12 md:w-4/6' : (layout === 'full') ? 'peer-[.koenig-lexical]:mt-12 md:w-4/6 peer-[.koenig-lexical]:md:mt-16 xl:w-1/2' : 'peer-[.koenig-lexical]:mt-10 peer-[.koenig-lexical]:md:mt-16'}`}>
                        <SubscribeForm
                            buttonSize={`${(layout === 'regular') ? 'medium' : (layout === 'wide') ? 'large' : 'xlarge'}`}
                            buttonStyle={buttonColor ? {
                                backgroundColor: hexColorValue(buttonColor),
                                color: hexColorValue(buttonTextColor)
                            } : {backgroundColor: `#000000`,
                                color: `#ffffff`}}
                            buttonText={buttonText || 'Subscribe'}
                            dataTestId='signup-card-button'
                            disabled={true}
                            inputBorderStyle={buttonColor ? {
                                border: `1px solid ${hexColorValue(buttonColor)}`
                            } : null}
                            mobileSize={`${(layout === 'full' || layout === 'split') && 'large'}`}
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
                                placeholderClassName={`truncate opacity-50 w-full h-[110%] whitespace-normal !leading-snug !font-normal !text-[1.6rem] !tracking-tight ${(alignment === 'center' && 'text-center')}`}
                                placeholderText={disclaimerPlaceholder}
                                singleParagraph={true}
                                textClassName={clsx(
                                    'koenig-lexical-header-subheading koenig-lexical-header-xsmall relative !mt-4 w-full whitespace-normal caret-current',
                                    alignment === 'center' && 'text-center [&:has(br)]:pl-[calc(50%_-_74px)] [&:has(br)]:text-left',
                                    (layout === 'split' && alignment === 'center') && '[&:has(br)]:pl-[calc(50%_-_54px)]'
                                )}
                            />
                        )
                    }
                </div>

                {/* Read-only overlay */}
                {!isEditing && <div className="absolute top-0 z-10 !m-0 h-full w-full cursor-default p-0"></div>}
            </div>

            {isEditing &&
                <div className="!mt-0 flex items-center justify-center bg-grey-100 p-2 font-sans text-sm font-normal leading-none text-grey-600 dark:bg-grey-950 dark:text-grey-800">
                    Only visible to logged out visitors, this card will not be displayed to members or in emails.
                </div>
            }

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
                    <ColorPickerSetting
                        dataTestId='signup-background-color'
                        eyedropper={layout === 'split'}
                        hasTransparentOption={true}
                        label='Background'
                        swatches={[
                            (layout !== 'split' && {
                                customContent: (
                                    <button
                                        className={clsx(
                                            `relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-grey-300 bg-grey-100 text-black`,
                                            showBackgroundImage && 'outline outline-2 outline-green'
                                        )}
                                        data-testid="signup-background-image-toggle"
                                        title="Image"
                                        type="button"
                                        onClick={handleShowBackgroundImage}
                                    >
                                        <ImgBgIcon className="h-[1.4rem] w-[1.4rem]" />
                                    </button>
                                )
                            }),
                            {title: 'Grey', hex: '#F4F4F4'},
                            {title: 'Black', hex: '#000000'},
                            {title: 'Brand color', accent: true}
                        ].filter(Boolean)}
                        value={(showBackgroundImage && layout !== 'split') ? '' : backgroundColor}
                        onChange={color => handleBackgroundColor(color, matchingTextColor(color))}
                    />
                    {showBackgroundImage && layout !== 'split' && <MediaUploadSetting
                        alt='Background image'
                        borderStyle={'dashed'}
                        desc='Click to upload'
                        errors={fileUploader?.errors}
                        hideLabel={layout !== 'split'}
                        icon='file'
                        isDraggedOver={imageDragHandler?.isDraggedOver}
                        isLoading={isLoading}
                        isPinturaEnabled={isPinturaEnabled}
                        label='Image'
                        mimeTypes={['image/*']}
                        openImageEditor={openImageEditor}
                        placeholderRef={imageDragHandler?.setRef}
                        progress={progress}
                        size='xsmall'
                        src={backgroundImageSrc}
                        onFileChange={onFileChange}
                        onRemoveMedia={handleClearBackgroundImage}
                    />}
                    <SettingsDivider />

                    <ColorPickerSetting
                        dataTestId='signup-button-color'
                        eyedropper={layout === 'split'}
                        label='Button'
                        swatches={[
                            {title: 'White', hex: '#ffffff'},
                            {title: 'Black', hex: '#000000'},
                            {title: 'Brand color', accent: true}
                        ]}
                        value={buttonColor}
                        onChange={color => handleButtonColor(color, matchingTextColor(color))}
                    />
                    <InputSetting
                        dataTestId='signup-button-text'
                        label='Button text'
                        placeholder='Add button text'
                        value={buttonText || 'Subscribe'}
                        hideLabel
                        onChange={handleButtonText}
                    />
                    <InputSetting
                        label='Success message'
                        placeholder='Add success message'
                        value={successMessage || 'Thanks! Now check your email to confirm.'}
                        onChange={handleSuccessMessage}
                    />
                    <MultiSelectDropdownSetting
                        availableItems={availableLabels}
                        dataTestId='labels-dropdown'
                        description='These labels will be applied to members who sign up via this form.'
                        items={labels}
                        label='Labels'
                        onChange={handleLabels}
                    />
                </SettingsPanel>
            )}
        </>
    );
}

SignupCard.propTypes = {
    alignment: PropTypes.oneOf(['left', 'center']),
    header: PropTypes.string,
    subheader: PropTypes.string,
    disclaimer: PropTypes.string,
    buttonColor: PropTypes.string,
    buttonText: PropTypes.string,
    buttonTextColor: PropTypes.string,
    buttonPlaceholder: PropTypes.string,
    backgroundImageSrc: PropTypes.string,
    backgroundColor: PropTypes.string,
    textColor: PropTypes.string,
    successMessage: PropTypes.string,
    showBackgroundImage: PropTypes.bool,
    isEditing: PropTypes.bool,
    isPinturaEnabled: PropTypes.bool,
    fileUploader: PropTypes.object,
    fileInputRef: PropTypes.object,
    handleLayout: PropTypes.func,
    handleAlignment: PropTypes.func,
    handleButtonText: PropTypes.func,
    handleClearBackgroundImage: PropTypes.func,
    handleBackgroundColor: PropTypes.func,
    handleShowBackgroundImage: PropTypes.func,
    handleButtonColor: PropTypes.func,
    handleLabels: PropTypes.func,
    handleTextColor: PropTypes.func,
    handleSuccessMessage: PropTypes.func,
    labels: PropTypes.arrayOf(PropTypes.string),
    layout: PropTypes.oneOf(['regular', 'wide', 'full', 'split']),
    availableLabels: PropTypes.arrayOf(PropTypes.object),
    openFilePicker: PropTypes.func,
    onFileChange: PropTypes.func,
    openImageEditor: PropTypes.func,
    imageDragHandler: PropTypes.object,
    headerTextEditor: PropTypes.object,
    headerTextEditorInitialState: PropTypes.string,
    subheaderTextEditor: PropTypes.object,
    subheaderTextEditorInitialState: PropTypes.string,
    disclaimerTextEditor: PropTypes.object,
    disclaimerTextEditorInitialState: PropTypes.string,
    isSwapped: PropTypes.bool,
    handleSwapLayout: PropTypes.func
};
