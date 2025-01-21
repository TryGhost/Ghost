import CenterAlignIcon from '../../../../../assets/icons/kg-align-center.svg?react';
import ExpandIcon from '../../../../../assets/icons/kg-expand.svg?react';
import ImgBgIcon from '../../../../../assets/icons/kg-img-bg.svg?react';
import ImgFullIcon from '../../../../../assets/icons/kg-img-full.svg?react';
import ImgRegularIcon from '../../../../../assets/icons/kg-img-regular.svg?react';
import ImgWideIcon from '../../../../../assets/icons/kg-img-wide.svg?react';
import KoenigNestedEditor from '../../../../KoenigNestedEditor';
import LayoutSplitIcon from '../../../../../assets/icons/kg-layout-split.svg?react';
import LeftAlignIcon from '../../../../../assets/icons/kg-align-left.svg?react';
import PropTypes from 'prop-types';
import React, {useEffect, useState} from 'react';
import ShrinkIcon from '../../../../../assets/icons/kg-shrink.svg?react';
import clsx from 'clsx';
import trackEvent from '../../../../../utils/analytics';
import {Button} from '../../../Button';
import {ButtonGroupSetting, ColorPickerSetting, InputSetting, InputUrlSetting, MediaUploadSetting, SettingsPanel, ToggleSetting} from '../../../SettingsPanel';
import {Color, textColorForBackgroundColor} from '@tryghost/color-utils';
import {FastAverageColor} from 'fast-average-color';
import {IconButton} from '../../../IconButton';
import {MediaUploader} from '../../../MediaUploader';
import {ReadOnlyOverlay} from '../../../ReadOnlyOverlay';
import {Tooltip} from '../../../Tooltip';
import {getAccentColor} from '../../../../../utils/getAccentColor';
import {isEditorEmpty} from '../../../../../utils/isEditorEmpty';
// Header Card Version 2
export function HeaderCard({alignment,
    buttonEnabled,
    buttonText,
    buttonUrl,
    showBackgroundImage,
    backgroundImageSrc,
    backgroundSize,
    backgroundColor,
    buttonColor,
    buttonTextColor,
    textColor,
    isEditing,
    fileUploader,
    handleAlignment,
    handleButtonText,
    handleButtonEnabled,
    handleShowBackgroundImage,
    handleHideBackgroundImage,
    handleClearBackgroundImage,
    handleBackgroundColor,
    handleButtonColor,
    handleLayout,
    handleTextColor,
    isPinturaEnabled,
    layout,
    onFileChange,
    openImageEditor,
    imageDragHandler,
    headerTextEditor,
    headerTextEditorInitialState,
    subheaderTextEditor,
    subheaderTextEditorInitialState,
    isSwapped,
    handleSwapLayout,
    handleBackgroundSize,
    handleButtonTextBlur,
    handleButtonUrlBlur,
    handleButtonUrl,
    setFileInputRef}) {
    const [backgroundColorPickerExpanded, setBackgroundColorPickerExpanded] = useState(false);
    const [buttonColorPickerExpanded, setButtonColorPickerExpanded] = useState(false);

    const matchingTextColor = (color) => {
        return color === 'transparent' ? '' : textColorForBackgroundColor(hexColorValue(color)).hex();
    };

    /**
     * Convert a semi transparent color to a fully opaque color by merging it with a white background
     */
    const mergeWhiteColor = ({r, g, b, a}) => {
        const aPercentage = a / 255;

        return Color({
            r: r * aPercentage + 255 * (1 - aPercentage),
            g: g * aPercentage + 255 * (1 - aPercentage),
            b: b * aPercentage + 255 * (1 - aPercentage)
        }).hex();
    };

    useEffect(() => {
        if (backgroundImageSrc && layout !== 'split') {
            new FastAverageColor().getColorAsync(backgroundImageSrc, {defaultColor: [255, 255, 255, 255]}).then((color) => {
                // If we uploaded a transparent image, the average color will be semi transparent, we need to merge it with white
                // Merge white color to the color
                const correctedHex = mergeWhiteColor({
                    r: color.value[0],
                    g: color.value[1],
                    b: color.value[2],
                    a: color.value[3]
                });
                handleTextColor(matchingTextColor(correctedHex));
            });
        }
        // This is only needed when the background image or layout is changed
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backgroundImageSrc, layout === 'split']);

    useEffect(() => {
        if (backgroundColor && layout === 'split') {
            // Make sure the text color matches the background color
            // It might be different if an image was uploaded in a non-split layout
            handleBackgroundColor(backgroundColor, matchingTextColor(backgroundColor));
        }
        // This is only needed when the layout is changed
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layout === 'split']);

    const layoutChildren = [
        {
            label: 'Regular',
            name: 'regular',
            Icon: ImgRegularIcon,
            dataTestId: 'header-layout-regular'
        },
        {
            label: 'Wide',
            name: 'wide',
            Icon: ImgWideIcon,
            dataTestId: 'header-layout-wide'
        },
        {
            label: 'Full',
            name: 'full',
            Icon: ImgFullIcon,
            dataTestId: 'header-layout-full'
        },
        {
            label: 'Split',
            name: 'split',
            Icon: LayoutSplitIcon,
            dataTestId: 'header-layout-split'
        }
    ];

    const alignmentChildren = [
        {
            label: 'Left',
            name: 'left',
            Icon: LeftAlignIcon,
            dataTestId: 'header-alignment-left'
        },
        {
            label: 'Center',
            name: 'center',
            Icon: CenterAlignIcon,
            dataTestId: 'header-alignment-center'
        }
    ];

    const {isLoading, progress} = fileUploader || {};

    const headerPlaceholder = layout === 'split' ? 'Heading' : 'Enter heading text';
    const subheaderPlaceholder = layout === 'split' ? 'Subheading text' : 'Enter subheading text';

    const hexColorValue = (color) => {
        if (color === 'accent') {
            const accentColor = getAccentColor().trim();
            return accentColor;
        }
        return color.trim();
    };

    const wrapperStyle = () => {
        if (backgroundImageSrc && layout !== 'split' && textColor) {
            return {
                backgroundImage: `url(${backgroundImageSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundColor: 'white',
                color: hexColorValue(textColor)
            };
        } else if (backgroundColor && textColor) {
            return {
                backgroundColor: hexColorValue(backgroundColor),
                color: hexColorValue(textColor)
            };
        }

        return {
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ctitle%3ERectangle%3C/title%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath fill='%23F2F6F8' d='M0 0h24v24H0z'/%3E%3Cpath fill='%23E5ECF0' d='M0 0h12v12H0zM12 12h12v12H12z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: 'transparent',
            color: hexColorValue(textColor)
        };
    };

    const toggleBackgroundSize = (event) => {
        event.stopPropagation();
        if (backgroundSize === 'cover') {
            handleBackgroundSize('contain');
            trackEvent('header Card Toggle Size', {size: 'contain'});
        } else {
            handleBackgroundSize('cover');
            trackEvent('header Card Toggle Size', {size: 'cover'});
        }
    };

    const toggleSwapped = () => {
        trackEvent('header Card Toggle Swapped', {swapped: !isSwapped});
        handleSwapLayout();
    };

    const toggleButton = () => {
        trackEvent('header card button toggled', {buttonEnabled: !buttonEnabled});
        handleButtonEnabled();
    };

    const correctedBackgroundSize = backgroundSize === 'contain' && backgroundImageSrc ? 'contain' : 'cover';

    const getButtonSize = (layoutString) => {
        if (layoutString === 'regular') {
            return 'medium';
        }

        if (layoutString === 'wide') {
            return 'medium';
        }

        if (layoutString === 'full') {
            return 'large';
        }

        if (layoutString === 'split') {
            return 'medium';
        }
    };

    return (
        <>
            <div className='flex w-full font-sans text-black transition-colors ease-in-out' data-testid={'header-card-container'} style={wrapperStyle()}>
                <div className={clsx(
                    'flex w-full flex-col transition-colors ease-in-out sm:flex-row',
                    (layout === 'split' && isSwapped) && 'flex-col-reverse sm:flex-row-reverse',
                    // This is needed to align the content with wide breakout width
                    (layout === 'full' || (layout === 'split' && (correctedBackgroundSize === 'contain'))) && 'mx-auto w-[calc(740px+4rem)] xs:w-[calc(740px+8rem)] md:w-[calc(740px+12rem)] lg:w-[calc(740px+22rem)] xl:w-[calc(740px+40rem)]',
                    (backgroundImageSrc && (layout === 'split') && (correctedBackgroundSize === 'contain')) && 'items-center',
                )} data-testid={'header-card-content'}>
                    {layout === 'split' && (
                        <MediaUploader
                            additionalActions={<>
                                <IconButton dataTestId="media-upload-size" Icon={(backgroundSize === 'cover') ? ShrinkIcon : ExpandIcon} label={(backgroundSize === 'cover') ? 'Contain' : 'Cover'} onClick={toggleBackgroundSize} />
                            </>}
                            alt='Background image'
                            backgroundSize={backgroundSize}
                            className={clsx(
                                'sm:w-1/2',
                                (correctedBackgroundSize === 'contain') && 'sm:my-10 md:my-14',
                                (!isSwapped && (correctedBackgroundSize === 'contain')) && 'mt-10 px-[calc(32px-(4rem/2))] xs:px-[calc(92px-(8rem/2))] sm:pl-[calc(92px-(12rem/2))] sm:pr-0 md:pl-[calc(92px-(12rem/2))] lg:pl-0',
                                (isSwapped && (correctedBackgroundSize === 'contain')) && 'mb-10 px-[calc(32px-(4rem/2))] xs:px-[calc(92px-(8rem/2))] sm:pl-0 sm:pr-[calc(92px-(12rem/2))] md:pr-[calc(92px-(12rem/2))] lg:pr-0',
                            )}
                            desc='Click to select an image'
                            dragHandler={imageDragHandler}
                            errors={fileUploader?.errors}
                            icon='image'
                            imgClassName={`${(correctedBackgroundSize === 'cover') && 'aspect-[3/2]'}`}
                            isEditing={isEditing}
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
                            (layout === 'regular') && 'p-[4rem] sm:py-[6rem] md:px-[6rem] md:py-[10rem] lg:px-[8rem]',
                            (layout === 'wide') && 'max-w-[740px] p-[4rem] sm:py-[6rem] md:px-[8rem] md:py-[14rem] lg:px-0',
                            (layout === 'full') && 'px-[calc(32px-(4rem/2))] py-[4rem] xs:px-[calc(92px-(8rem/2))] sm:py-[6rem] md:px-[calc(92px-(12rem/2))] md:py-[12rem] lg:px-0 lg:py-[14rem] xl:py-[18rem]',
                            (layout === 'split') && 'p-[4rem] sm:py-[6rem] md:px-[6rem] md:py-[12rem] lg:px-[8rem] lg:py-[16rem]',
                            (!isSwapped && layout === 'split' && correctedBackgroundSize === 'contain') && 'px-[calc(32px-(4rem/2))] xs:px-[calc(92px-(8rem/2))] sm:px-[calc(92px-(12rem/2))] md:pr-[calc(92px-(12rem/2))] lg:pr-0',
                            (isSwapped && layout === 'split' && correctedBackgroundSize === 'contain') && 'px-[calc(32px-(4rem/2))] xs:px-[calc(92px-(8rem/2))] sm:px-[calc(92px-(12rem/2))] md:pl-[calc(92px-(12rem/2))] lg:pl-0',
                        )}>
                        {/* Heading */}
                        {<KoenigNestedEditor
                            autoFocus={true}
                            dataTestId="header-heading-editor"
                            focusNext={subheaderTextEditor}
                            hasSettingsPanel={true}
                            hiddenFormats={['bold']}
                            initialEditor={headerTextEditor}
                            initialEditorState={headerTextEditorInitialState}
                            nodes="minimal"
                            placeholderClassName={clsx(
                                '!font-bold !leading-[1.1] !tracking-tight opacity-50',
                                (alignment === 'center') && 'text-center',
                                (layout === 'regular') && 'text-3xl sm:text-4xl',
                                (layout === 'wide' || layout === 'split') && 'text-3xl sm:text-4xl md:text-5xl',
                                (layout === 'full') && 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
                            )}
                            placeholderText={headerPlaceholder}
                            singleParagraph={true}
                            style={{color: matchingTextColor(backgroundColor)}}
                            textClassName={clsx(
                                'koenig-lexical-heading relative w-full whitespace-normal font-bold caret-current',
                                (!isEditing && isEditorEmpty(headerTextEditor)) ? 'hidden' : 'peer',
                                (alignment === 'center') && 'text-center [&:has(.placeholder)]:w-fit [&:has(.placeholder)]:text-left',
                                (layout === 'regular') && 'heading-small',
                                (layout === 'wide' || layout === 'split') && 'heading-medium',
                                (layout === 'full') && 'heading-large',
                            )}
                        />}

                        {/* Subheading */}
                        {<KoenigNestedEditor
                            dataTestId="header-subheader-editor"
                            defaultKoenigEnterBehavior={true}
                            hasSettingsPanel={true}
                            initialEditor={subheaderTextEditor}
                            initialEditorState={subheaderTextEditorInitialState}
                            nodes="minimal"
                            placeholderClassName={clsx(
                                '!font-medium !leading-snug !tracking-tight opacity-60',
                                (alignment === 'center') && 'text-center',
                                (layout === 'regular') && 'text-lg sm:text-xl',
                                (layout === 'wide' || layout === 'split') && 'text-lg leading-snug sm:text-xl md:text-[2.2rem]',
                                layout === 'full' && 'text-lg sm:text-xl md:text-[2.2rem] lg:text-[2.6rem] xl:max-w-[880px]',
                            )}
                            placeholderText={subheaderPlaceholder}
                            singleParagraph={true}
                            style={{color: matchingTextColor(backgroundColor)}}
                            textClassName={clsx(
                                'koenig-lexical-subheading relative w-full whitespace-normal caret-current',
                                (!isEditing && isEditorEmpty(subheaderTextEditor)) ? 'hidden' : 'peer',
                                (alignment === 'center') && 'text-center [&:has(.placeholder)]:w-fit [&:has(.placeholder)]:text-left',
                                (layout === 'regular') && 'subheading-small !mt-2',
                                (layout === 'wide' || layout === 'split') && 'subheading-medium !mt-3',
                                (layout === 'full') && 'subheading-large !mt-3 xl:max-w-[880px]'
                            )}
                        />}

                        {/* Button */}

                        {
                            buttonEnabled && (
                                <div
                                    className={`text-${alignment} w-full ${(layout === 'regular') ? 'peer-[.koenig-lexical]:mt-8' : (layout === 'wide') ? 'peer-[.koenig-lexical]:mt-8 md:w-2/3' : (layout === 'full') ? 'peer-[.koenig-lexical]:mt-8 md:w-2/3 peer-[.koenig-lexical]:md:mt-8 xl:w-1/2' : 'max-w-[500px] peer-[.koenig-lexical]:mt-8 peer-[.koenig-lexical]:md:mt-8'}`}>
                                    <Button
                                        dataTestId="header-card-button"
                                        disabled={true}
                                        placeholder='Add button text'
                                        size={getButtonSize(layout)}
                                        style={buttonColor ? {
                                            backgroundColor: hexColorValue(buttonColor),
                                            color: hexColorValue(buttonTextColor)
                                        } : {backgroundColor: `#000000`,
                                            color: `#ffffff`}}
                                        value={buttonText}
                                    />
                                </div>
                            )
                        }
                    </div>
                </div>

                {/* Read-only overlay */}
                {!isEditing && <ReadOnlyOverlay />}
            </div>

            {isEditing && (
                <SettingsPanel cardWidth={layout} className="mt-0">
                    <ButtonGroupSetting
                        buttons={layoutChildren}
                        label='Layout'
                        selectedName={layout}
                        onClick={handleLayout}
                    />
                                        
                    {
                        layout === 'split' && (
                            <ToggleSetting
                                dataTestId='header-swapped'
                                isChecked={isSwapped}
                                label='Flip Layout'
                                onChange={toggleSwapped}
                            />

                        )
                    }

                    <ButtonGroupSetting
                        buttons={alignmentChildren}
                        label='Alignment'
                        selectedName={alignment}
                        onClick={handleAlignment}
                    />

                    <ColorPickerSetting
                        dataTestId='header-background-color'
                        eyedropper={layout === 'split'}
                        hasTransparentOption={true}
                        isExpanded={backgroundColorPickerExpanded}
                        label='Background'
                        swatches={[
                            (layout !== 'split' && {
                                title: 'Image',
                                customContent: (
                                    <button
                                        className={clsx(
                                            `group relative flex size-6 shrink-0 items-center justify-center rounded-full border border-grey-300 bg-grey-100 text-black`,
                                            showBackgroundImage && 'outline outline-2 outline-green'
                                        )}
                                        data-testid="header-background-image-toggle"
                                        title="Image"
                                        type="button"
                                        onClick={() => {
                                            handleShowBackgroundImage();
                                            setBackgroundColorPickerExpanded(false);
                                            setButtonColorPickerExpanded(false);
                                        }}
                                    >
                                        <ImgBgIcon className="size-[1.4rem]" />
                                        <Tooltip label='Image' />
                                    </button>
                                )
                            }),
                            {title: 'Black', hex: '#000000'},
                            {title: 'Grey', hex: '#F0F0F0'},
                            {title: 'Brand color', accent: true}
                        ].filter(Boolean)}
                        value={(showBackgroundImage && layout !== 'split') ? '' : backgroundColor}
                        onPickerChange={color => handleBackgroundColor(color, matchingTextColor(color))}
                        onSwatchChange={(color) => {
                            handleBackgroundColor(color, matchingTextColor(color));
                            setBackgroundColorPickerExpanded(false);
                        }}
                        onTogglePicker={ (isExpanded) => {
                            if (isExpanded) {
                                if (layout !== 'split') {
                                    handleHideBackgroundImage();
                                }

                                if (backgroundColor) {
                                    handleBackgroundColor(backgroundColor, matchingTextColor(backgroundColor));
                                }
                            }

                            setBackgroundColorPickerExpanded(isExpanded);
                            if (isExpanded) {
                                setButtonColorPickerExpanded(!isExpanded);
                            }
                        }}
                    />
                    <MediaUploadSetting
                        alt='Background image'
                        borderStyle={'rounded'}
                        className={(!showBackgroundImage || layout === 'split') && 'hidden'}
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
                        setFileInputRef={setFileInputRef}
                        size='xsmall'
                        src={backgroundImageSrc}
                        stacked={true}
                        onFileChange={onFileChange}
                        onRemoveMedia={() => {
                            handleClearBackgroundImage();
                            handleTextColor(matchingTextColor(backgroundColor));
                        }}
                    />

                    {/* Button settings */}
                    <ToggleSetting
                        dataTestId='header-button-toggle'
                        isChecked={buttonEnabled}
                        label='Button'
                        onChange={toggleButton}
                    />
                    {buttonEnabled && (
                        <>
                            <ColorPickerSetting
                                dataTestId='header-button-color'
                                eyedropper={layout === 'split'}
                                isExpanded={buttonColorPickerExpanded}
                                label='Button Color'
                                swatches={[
                                    {title: 'White', hex: '#ffffff'},
                                    {title: 'Black', hex: '#000000'},
                                    {title: 'Brand color', accent: true}
                                ]}
                                value={buttonColor}
                                onPickerChange={color => handleButtonColor(color, matchingTextColor(color))}
                                onSwatchChange={(color) => {
                                    handleButtonColor(color, matchingTextColor(color));
                                    setButtonColorPickerExpanded(false);
                                }}
                                onTogglePicker={(isExpanded) => {
                                    setButtonColorPickerExpanded(isExpanded);
                                    if (isExpanded) {
                                        setBackgroundColorPickerExpanded(!isExpanded);
                                    }
                                }}
                            />
                            <InputSetting
                                dataTestId='header-button-text'
                                label='Button text'
                                placeholder='Add button text'
                                value={buttonText}
                                onBlur={handleButtonTextBlur}
                                onChange={handleButtonText}
                            />
                            <InputUrlSetting
                                dataTestId='header-button-url'
                                label='Button URL'
                                value={buttonUrl}
                                onChange={handleButtonUrl}
                            />
                        </>
                    )}
                </SettingsPanel>
            )}
        </>
    );
}

HeaderCard.propTypes = {
    alignment: PropTypes.oneOf(['left', 'center']),
    buttonColor: PropTypes.string,
    buttonText: PropTypes.string,
    buttonTextColor: PropTypes.string,
    buttonEnabled: PropTypes.bool,
    buttonPlaceholder: PropTypes.string,
    backgroundImageSrc: PropTypes.string,
    backgroundSize: PropTypes.oneOf(['cover', 'contain']),
    backgroundColor: PropTypes.string,
    textColor: PropTypes.string,
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
    handleHideBackgroundImage: PropTypes.func,
    handleButtonColor: PropTypes.func,
    handleTextColor: PropTypes.func,
    layout: PropTypes.oneOf(['regular', 'wide', 'full', 'split']),
    openFilePicker: PropTypes.func,
    onFileChange: PropTypes.func,
    openImageEditor: PropTypes.func,
    imageDragHandler: PropTypes.object,
    headerTextEditor: PropTypes.object,
    headerTextEditorInitialState: PropTypes.object,
    subheaderTextEditor: PropTypes.object,
    subheaderTextEditorInitialState: PropTypes.object,
    isSwapped: PropTypes.bool,
    handleSwapLayout: PropTypes.func,
    handleBackgroundSize: PropTypes.func,
    setFileInputRef: PropTypes.func,
    handleButtonTextBlur: PropTypes.func
};
