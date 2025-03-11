import ImmersiveLayoutIcon from '../../../assets/icons/kg-layout-immersive.svg?react';
import KoenigNestedEditor from '../../KoenigNestedEditor.jsx';
import MinimalLayoutIcon from '../../../assets/icons/kg-layout-minimal.svg?react';
import PropTypes from 'prop-types';
import React, {useState} from 'react';
import ReplacementStringsPlugin from '../../../plugins/ReplacementStringsPlugin.jsx';
import clsx from 'clsx';
import defaultTheme from '../../../themes/default.js';
import {Button} from '../Button.jsx';
import {ButtonGroupSettingBeta, ColorOptionSettingBeta, ColorPickerSettingBeta, InputSetting, InputUrlSetting, MediaUploadSettingBeta, SettingsPanel, ToggleSetting} from '../SettingsPanel.jsx';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay.jsx';
import {RestrictContentPlugin} from '../../../index.js';
import {VisibilitySettings} from '../VisibilitySettings.jsx';
import {getAccentColor} from '../../../utils/getAccentColor.js';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

export const CALLTOACTION_COLORS = {
    none: 'bg-transparent border-transparent',
    white: 'bg-transparent border-grey-900/15 dark:border-grey-100/20',
    grey: 'bg-grey/10 border-transparent',
    blue: 'bg-blue/10 border-transparent',
    green: 'bg-green/10 border-transparent',
    yellow: 'bg-yellow/10 border-transparent',
    red: 'bg-red/10 border-transparent',
    pink: 'bg-pink/10 border-transparent',
    purple: 'bg-purple/10 border-transparent'
};

const sponsoredLabelTheme = {
    ...defaultTheme,
    link: 'text-accent'
};

export const callToActionColorPicker = [
    {
        label: 'None',
        name: 'none',
        color: 'bg-transparent border-black/15 relative after:absolute after:left-1/2 after:top-1/2 after:h-[1px] after:w-[18px] after:-translate-x-1/2 after:-translate-y-1/2 after:-rotate-45 after:bg-red-500'
    },
    {
        label: 'White',
        name: 'white',
        color: 'bg-transparent border-black/15 dark:border-white/10'
    },
    {
        label: 'Grey',
        name: 'grey',
        color: 'bg-grey/20 border-black/[.08] dark:border-white/10'
    },
    {
        label: 'Blue',
        name: 'blue',
        color: 'bg-blue/20 border-black/[.08] dark:border-white/10'
    },
    {
        label: 'Green',
        name: 'green',
        color: 'bg-green/20 border-black/[.08] dark:border-white/10'
    },
    {
        label: 'Yellow',
        name: 'yellow',
        color: 'bg-yellow/20 border-black/[.08] dark:border-white/10'
    },
    {
        label: 'Red',
        name: 'red',
        color: 'bg-red/20 border-black/[.08] dark:border-white/10'
    },
    {
        label: 'Pink',
        name: 'pink',
        color: 'bg-pink/20 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Purple',
        name: 'purple',
        color: 'bg-purple/20 border-black/[0.08] dark:border-white/10'
    }
];

export function CallToActionCard({
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
    onFileChange = () => {},
    onRemoveMedia = () => {},
    setFileInputRef = () => {},
    updateButtonText = () => {},
    updateButtonUrl = () => {},
    updateHasSponsorLabel = () => {},
    updateLayout = () => {},
    updateShowButton = () => {},
    toggleVisibility = () => {},
    imageDragHandler = {}
}) {
    const [buttonColorPickerExpanded, setButtonColorPickerExpanded] = useState(false);

    const tabs = [
        {id: 'design', label: 'Design'},
        {id: 'visibility', label: 'Visibility'}
    ];

    const layoutOptions = [
        {
            label: 'Minimal',
            name: 'minimal',
            Icon: MinimalLayoutIcon,
            dataTestId: 'minimal-layout',
            ariaLabel: 'Left-aligned layout with small, square image'
        },
        {
            label: 'Immersive',
            name: 'immersive',
            Icon: ImmersiveLayoutIcon,
            dataTestId: 'immersive-layout',
            ariaLabel: 'Center-aligned layout with full-width image and button'
        }
    ];

    const matchingTextColor = (bgColor) => {
        return bgColor === 'transparent' ? '' : textColorForBackgroundColor(bgColor === 'accent' ? getAccentColor() : bgColor).hex();
    };

    const designSettings = (
        <>
            {/* Layout settings */}
            <ButtonGroupSettingBeta
                buttons={layoutOptions}
                hasTooltip={false}
                label='Layout'
                selectedName={layout}
                onClick={updateLayout}
            />
            {/* Color picker */}
            <ColorOptionSettingBeta
                buttons={callToActionColorPicker}
                dataTestId='cta-background-color-picker'
                label='Background'
                selectedName={color}
                onClick={handleColorChange}
            />
            {/* Sponsor label setting */}
            <ToggleSetting
                dataTestId="sponsor-label-toggle"
                isChecked={hasSponsorLabel}
                label='Sponsor label'
                onChange={updateHasSponsorLabel}
            />
            {/* Image setting */}
            <MediaUploadSettingBeta
                alt='Image'
                borderStyle={'rounded'}
                desc='Upload'
                icon='file'
                isDraggedOver={imageDragHandler.isDraggedOver}
                isLoading={imageDragHandler.isLoading}
                label='Image'
                mimeTypes={['image/*']}
                placeholderRef={imageDragHandler.setRef}
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
                    <ColorPickerSettingBeta
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

    const visibilitySettings = (
        <VisibilitySettings
            toggleVisibility={toggleVisibility}
            visibilityOptions={visibilityOptions}
        />
    );

    return (
        <>
            <div className={clsx(
                'w-full rounded-lg border',
                CALLTOACTION_COLORS[color],
                {
                    'py-3': color === 'none' && !hasSponsorLabel,
                    'pb-3': color === 'none' && hasSponsorLabel
                }
            )} data-cta-layout={layout}>

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
                            initialTheme={sponsoredLabelTheme}
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
                    <div className="flex flex-col gap-6">
                        {/* HTML content */}
                        <KoenigNestedEditor
                            autoFocus={true}
                            dataTestId={'cta-card-content-editor'}
                            hasSettingsPanel={true}
                            initialEditor={htmlEditor}
                            initialEditorState={htmlEditorInitialState}
                            nodes='basic'
                            placeholderClassName={`bg-transparent whitespace-normal font-serif text-xl !text-grey-500 !dark:text-grey-800 ` }
                            placeholderText="Write something worth clicking..."
                            textClassName="koenig-lexical-cta-text w-full whitespace-normal text-pretty bg-transparent font-serif text-xl text-grey-900 dark:text-grey-200"
                        >
                            <ReplacementStringsPlugin />
                        </KoenigNestedEditor>

                        {/* Button */}
                        { (showButton && (isEditing || (buttonText && buttonUrl))) &&
                            <div data-test-cta-button-current-url={buttonUrl}>
                                <Button
                                    color={'accent'}
                                    dataTestId="cta-button"
                                    placeholder="Add button text"
                                    size={layout === 'immersive' ? 'medium' : 'small'}
                                    style={buttonColor !== 'accent' ? {
                                        backgroundColor: buttonColor,
                                        color: buttonTextColor
                                    } : undefined}
                                    value={buttonText}
                                    width={layout === 'immersive' ? 'full' : 'regular'}
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
                    defaultTab="design"
                    tabs={tabs}
                    onMouseDown={e => e.preventDefault()}
                >
                    {{
                        design: designSettings,
                        visibility: visibilitySettings
                    }}
                </SettingsPanel>
            )}
        </>
    );
}

CallToActionCard.propTypes = {
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
    imageDragHandler: PropTypes.object
};
