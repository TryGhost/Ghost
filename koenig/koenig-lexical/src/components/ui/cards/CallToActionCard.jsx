import CenterAlignIcon from '../../../assets/icons/kg-align-center.svg?react';
import ImmersiveLayoutIcon from '../../../assets/icons/kg-layout-immersive.svg?react';
import KoenigNestedEditor from '../../KoenigNestedEditor.jsx';
import LeftAlignIcon from '../../../assets/icons/kg-align-left.svg?react';
import MinimalLayoutIcon from '../../../assets/icons/kg-layout-minimal.svg?react';
import PropTypes from 'prop-types';
import React, {useState} from 'react';
import ReplacementStringsPlugin from '../../../plugins/ReplacementStringsPlugin.jsx';
import clsx from 'clsx';
import defaultTheme from '../../../themes/default.js';
import {Button} from '../Button.jsx';
import {ButtonGroupSetting, ColorOptionSetting, ColorPickerSetting, InputSetting, InputUrlSetting, MediaUploadSetting, SettingsPanel, ToggleSetting} from '../SettingsPanel.jsx';
import {CALLTOACTION_COLORS} from '../../../utils/callToActionColors.js';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay.jsx';
import {RestrictContentPlugin} from '../../../index.js';
import {VisibilitySettings} from '../VisibilitySettings.jsx';
import {getAccentColor} from '../../../utils/getAccentColor.js';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

const getTheme = () => ({
    ...defaultTheme,
    link: 'cta-link-color'
});

export const callToActionColorPicker = [
    {
        label: 'None',
        name: 'none',
        color: 'bg-transparent border-black/15 dark:border-white/15 relative after:absolute after:left-1/2 after:top-1/2 after:h-[1px] after:w-[18px] after:-translate-x-1/2 after:-translate-y-1/2 after:-rotate-45 after:bg-red-500'
    },
    {
        label: 'White',
        name: 'white',
        color: 'bg-transparent border-black/15 dark:border-white/15'
    },
    {
        label: 'Grey',
        name: 'grey',
        color: 'bg-grey/20 border-black/[.08] dark:border-white/15'
    },
    {
        label: 'Blue',
        name: 'blue',
        color: 'bg-blue/20 border-black/[.08] dark:border-white/15'
    },
    {
        label: 'Green',
        name: 'green',
        color: 'bg-green/20 border-black/[.08] dark:border-white/15'
    },
    {
        label: 'Yellow',
        name: 'yellow',
        color: 'bg-yellow/20 border-black/[.08] dark:border-white/15'
    },
    {
        label: 'Red',
        name: 'red',
        color: 'bg-red/20 border-black/[.08] dark:border-white/15'
    },
    {
        label: 'Pink',
        name: 'pink',
        color: 'bg-pink/20 border-black/[0.08] dark:border-white/15'
    },
    {
        label: 'Purple',
        name: 'purple',
        color: 'bg-purple/20 border-black/[0.08] dark:border-white/15'
    }
];

export const callToActionLinkColorPicker = [
    {
        label: 'Text color',
        name: 'text',
        color: 'bg-black border-black dark:bg-white dark:border-white'
    },
    {
        label: 'Brand color',
        name: 'accent',
        color: 'bg-accent border-accent'
    }
];

export function CallToActionCard({
    alignment = 'left',
    buttonColor = '',
    buttonText = '',
    buttonTextColor = '',
    buttonUrl = '',
    color = 'none',
    hasSponsorLabel = false,
    htmlEditor,
    htmlEditorInitialState,
    sponsorLabelHtmlEditor,
    sponsorLabelHtmlEditorInitialState,
    imageSrc = '',
    isEditing = false,
    layout = 'immersive',
    showButton = false,
    visibilityOptions = {},
    handleButtonColor = () => {},
    handleColorChange = () => {},
    handleLinkColorChange = () => {},
    onFileChange = () => {},
    onRemoveMedia = () => {},
    setFileInputRef = () => {},
    updateAlignment = () => {},
    updateButtonText = () => {},
    updateButtonUrl = () => {},
    updateHasSponsorLabel = () => {},
    updateLayout = () => {},
    updateShowButton = () => {},
    toggleVisibility = () => {},
    imageDragHandler = {},
    imageUploader = () => {},
    linkColor = 'text',
    showVisibilitySettings = false
}) {
    const [buttonColorPickerExpanded, setButtonColorPickerExpanded] = useState(false);

    const {isLoading, progress} = imageUploader || {};

    const tabs = [
        {id: 'content', label: 'Content'},
        {id: 'design', label: 'Design'},
        {id: 'visibility', label: 'Visibility'}
    ];

    const layoutOptions = [
        {
            label: 'Minimal',
            name: 'minimal',
            Icon: MinimalLayoutIcon,
            dataTestId: 'minimal-layout',
            ariaLabel: 'Small, square image'
        },
        {
            label: 'Full',
            name: 'immersive',
            Icon: ImmersiveLayoutIcon,
            dataTestId: 'immersive-layout',
            ariaLabel: 'Full-width image'
        }
    ];

    const alignmentOptions = [
        {
            label: 'Left',
            name: 'left',
            Icon: LeftAlignIcon,
            dataTestId: 'left-align'
        },
        {
            label: 'Center',
            name: 'center',
            Icon: CenterAlignIcon,
            dataTestId: 'center-align'
        }
    ];

    const matchingTextColor = (bgColor) => {
        return bgColor === 'transparent' ? '' : textColorForBackgroundColor(bgColor === 'accent' ? getAccentColor() : bgColor).hex();
    };

    const theme = getTheme();

    const contentSettings = (
        <>
            {/* Sponsor label setting */}
            <ToggleSetting
                dataTestId="sponsor-label-toggle"
                isChecked={hasSponsorLabel}
                label='Sponsor label'
                onChange={updateHasSponsorLabel}
            />
            {/* Image setting */}
            <MediaUploadSetting
                alt='Image'
                borderStyle={'rounded'}
                desc='Upload'
                icon='file'
                isDraggedOver={imageDragHandler.isDraggedOver}
                isLoading={isLoading}
                label='Image'
                mimeTypes={['image/*']}
                placeholderRef={imageDragHandler.setRef}
                progress={progress}
                setFileInputRef={setFileInputRef}
                src={imageSrc}
                type='button'
                onFileChange={onFileChange}
                onRemoveMedia={onRemoveMedia}
            />
            <hr className="not-kg-prose my-2 block border-t-grey-300 dark:border-t-grey-900" />
            {/* Button settings */}
            <ToggleSetting
                dataTestId="button-settings"
                isChecked={showButton}
                label='Button'
                onChange={updateShowButton}
            />
            {showButton && (
                <>
                    <InputSetting
                        dataTestId="button-text"
                        label='Button text'
                        placeholder='Add button text'
                        value={buttonText}
                        onChange={updateButtonText}
                    />
                    <InputUrlSetting
                        dataTestId="button-url"
                        label='Button URL'
                        value={buttonUrl}
                        onChange={updateButtonUrl}
                    />
                </>
            )}
        </>
    );

    const designSettings = (
        <>
            {/* Layout settings */}
            <ButtonGroupSetting
                buttons={layoutOptions}
                label='Layout'
                selectedName={layout}
                onClick={updateLayout}
            />
            {layout === 'immersive' &&
                <>
                    <ButtonGroupSetting
                        buttons={alignmentOptions}
                        label='Alignment'
                        selectedName={alignment}
                        onClick={updateAlignment}
                    />
                </>
            }
            {/* Color picker */}
            <ColorOptionSetting
                buttons={callToActionColorPicker}
                dataTestId='cta-background-color-picker'
                label='Background'
                selectedName={color}
                onClick={handleColorChange}
            />
            {/* Link color setting */}
            <ColorOptionSetting
                buttons={callToActionLinkColorPicker}
                dataTestId='cta-link-color-picker'
                label='Link color'
                selectedName={linkColor}
                onClick={handleLinkColorChange}
            />
            {showButton && (
                <ColorPickerSetting
                    dataTestId='cta-button-color'
                    eyedropper={true}
                    isExpanded={buttonColorPickerExpanded}
                    label='Button Color'
                    swatches={[
                        {title: 'Black', hex: '#000000'},
                        {title: 'Grey', hex: '#F0F0F0'},
                        {title: 'Brand color', accent: true}
                    ]}
                    value={buttonColor}
                    onPickerChange={bgColor => handleButtonColor(bgColor, matchingTextColor(bgColor))}
                    onSwatchChange={(bgColor) => {
                        handleButtonColor(bgColor, matchingTextColor(bgColor));
                        setButtonColorPickerExpanded(false);
                    }}
                    onTogglePicker={(isExpanded) => {
                        setButtonColorPickerExpanded(isExpanded);
                    }}
                />
            )}
        </>
    );

    const visibilitySettings = (
        <VisibilitySettings
            toggleVisibility={toggleVisibility}
            visibilityOptions={visibilityOptions}
        />
    );

    return (
        <>
            <div 
                className={clsx(
                    'w-full rounded-lg border',
                    CALLTOACTION_COLORS[color],
                    {
                        'py-3': color === 'none' && !hasSponsorLabel,
                        'pb-3': color === 'none' && hasSponsorLabel
                    }
                )} 
                data-cta-layout={layout}
                style={{
                    '--cta-link-color': linkColor === 'accent' 
                        ? getAccentColor() 
                        : 'var(--cta-link-color-text)'
                }}
            >

                {/* Sponsor label */}
                {hasSponsorLabel && (
                    <div className={clsx(
                        'py-3',
                        {'mx-6': color !== 'none'}
                    )}>
                        <KoenigNestedEditor
                            autoFocus={true}
                            dataTestId={'sponsor-label-editor'}
                            hasSettingsPanel={true}
                            initialEditor={sponsorLabelHtmlEditor}
                            initialEditorState={sponsorLabelHtmlEditorInitialState}
                            initialTheme={theme}
                            nodes='basic'
                            textClassName={clsx(
                                'koenig-lexical-cta-label not-kg-prose w-full whitespace-normal font-sans !text-xs font-semibold uppercase leading-8 tracking-normal text-grey-900/50 dark:text-grey-200/40'
                            )}
                            useDefaultClasses={false}
                        >
                            <RestrictContentPlugin allowBr={false} paragraphs={1} />
                        </KoenigNestedEditor>
                    </div>
                )}

                <div className={clsx(
                    'flex gap-6',
                    hasSponsorLabel && color !== 'none' && (imageSrc && layout === 'immersive') ? '' : 'pt-6',
                    imageSrc && !showButton ? 'pb-8' : 'pb-7',
                    layout === 'immersive' ? 'flex-col' : 'flex-row',
                    color === 'none' || (hasSponsorLabel && !(imageSrc && layout === 'immersive')) ? 'border-t border-grey-900/15 dark:border-grey-100/20' : '',
                    color === 'none' ? 'border-b border-grey-900/15 dark:border-grey-100/20' : 'mx-6'
                )}>
                    {imageSrc && (
                        <div className={clsx(
                            'block',
                            layout === 'immersive' ? 'w-full' : 'w-16 shrink-0'
                        )}>
                            <img
                                alt="Placeholder"
                                className={clsx(
                                    layout === 'immersive' ? 'h-auto w-full' : 'aspect-square w-16 object-cover',
                                    'rounded-md'
                                )}
                                data-testid="cta-card-image"
                                src={imageSrc}
                            />
                        </div>
                    )}
                    <div className={clsx(
                        'flex w-full flex-col gap-6', 
                        layout === 'immersive' && alignment === 'center' ? 'items-center' : ''
                    )}>
                        {/* HTML content */}
                        <KoenigNestedEditor
                            autoFocus={true}
                            dataTestId={'cta-card-content-editor'}
                            hasSettingsPanel={true}
                            initialEditor={htmlEditor}
                            initialEditorState={htmlEditorInitialState}
                            initialTheme={theme}
                            nodes='basic'
                            placeholderClassName={`bg-transparent whitespace-normal font-serif text-xl !text-grey-500 !dark:text-grey-800 `}
                            placeholderText="Write something worth clicking..."
                            textClassName={clsx(
                                'koenig-lexical-cta-text w-full whitespace-normal text-pretty bg-transparent font-serif text-xl text-grey-900 dark:text-grey-200',
                                alignment === 'center' && layout === 'immersive' ? 'text-center [&:has(.placeholder)]:w-fit [&:has(.placeholder)]:text-left' : 'text-left'
                            )}
                        >
                            <ReplacementStringsPlugin />
                        </KoenigNestedEditor>

                        {/* Button */}
                        { (showButton && (isEditing || (buttonText && buttonUrl))) &&
                            <div className={clsx(
                                layout === 'immersive' && imageSrc ? 'w-full' : ''
                            )} data-test-cta-button-current-url={buttonUrl}>
                                <Button
                                    color={'accent'}
                                    data-test-cta-button-current-url={buttonUrl}
                                    dataTestId="cta-button"
                                    placeholder="Add button text"
                                    size={layout === 'immersive' && imageSrc ? 'medium' : 'small'}
                                    style={buttonColor !== 'accent' ? {
                                        backgroundColor: buttonColor,
                                        color: buttonTextColor
                                    } : undefined}
                                    value={buttonText}
                                    width={layout === 'minimal' || !imageSrc ? 'regular' : 'full'}
                                />
                            </div>
                        }
                    </div>
                </div>

                {/* Read-only overlay */}
                {!isEditing && <ReadOnlyOverlay />}
            </div>

            {isEditing && (
                <SettingsPanel
                    defaultTab={showVisibilitySettings ? 'visibility' : 'content'}
                    tabs={tabs}
                    onMouseDown={e => e.preventDefault()}
                >
                    {{
                        content: contentSettings,
                        design: designSettings,
                        visibility: visibilitySettings
                    }}
                </SettingsPanel>
            )}
        </>
    );
}

CallToActionCard.propTypes = {
    alignment: PropTypes.oneOf(['left', 'center']),
    buttonText: PropTypes.string,
    buttonUrl: PropTypes.string,
    buttonColor: PropTypes.string,
    buttonTextColor: PropTypes.string,
    color: PropTypes.oneOf(['none', 'grey', 'white', 'blue', 'green', 'yellow', 'red', 'pink', 'purple']),
    hasSponsorLabel: PropTypes.bool,
    imageSrc: PropTypes.string,
    isEditing: PropTypes.bool,
    layout: PropTypes.oneOf(['minimal', 'immersive']),
    showButton: PropTypes.bool,
    htmlEditor: PropTypes.object,
    htmlEditorInitialState: PropTypes.object,
    updateAlignment: PropTypes.func,
    updateButtonText: PropTypes.func,
    updateButtonUrl: PropTypes.func,
    updateHasSponsorLabel: PropTypes.func,
    updateShowButton: PropTypes.func,
    updateLayout: PropTypes.func,
    handleColorChange: PropTypes.func,
    handleButtonColor: PropTypes.func,
    onFileChange: PropTypes.func,
    setFileInputRef: PropTypes.func,
    onRemoveMedia: PropTypes.func,
    sponsorLabelHtmlEditor: PropTypes.object,
    sponsorLabelHtmlEditorInitialState: PropTypes.object,
    visibilityOptions: PropTypes.array,
    toggleVisibility: PropTypes.func,
    imageUploadHandler: PropTypes.func,
    imageDragHandler: PropTypes.object,
    linkColor: PropTypes.oneOf(['text', 'accent']),
    handleLinkColorChange: PropTypes.func,
    imageUploader: PropTypes.object,
    showVisibilitySettings: PropTypes.bool
};
