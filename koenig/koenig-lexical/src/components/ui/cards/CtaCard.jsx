import ImmersiveLayoutIcon from '../../../assets/icons/kg-layout-immersive.svg?react';
import KoenigNestedEditor from '../../KoenigNestedEditor';
import MinimalLayoutIcon from '../../../assets/icons/kg-layout-minimal.svg?react';
import PropTypes from 'prop-types';
import React, {useState} from 'react';
import ReplacementStringsPlugin from '../../../plugins/ReplacementStringsPlugin';
import clsx from 'clsx';
import {Button} from '../Button';
import {ButtonGroupSetting, ColorOptionSetting, ColorPickerSetting, InputSetting, InputUrlSetting, MediaUploadSetting, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';
import {getAccentColor} from '../../../utils/getAccentColor';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

export const CTA_COLORS = {
    none: 'bg-transparent border-transparent',
    white: 'bg-transparent border-grey-900/15 dark:border-grey-100/20',
    grey: 'bg-grey/10 border-transparent',
    blue: 'bg-blue/10 border-transparent',
    green: 'bg-green/10 border-transparent',
    yellow: 'bg-yellow/10 border-transparent',
    red: 'bg-red/10 border-transparent'
};

export const ctaColorPicker = [
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
        color: 'bg-grey/15 border-black/[.08] dark:border-white/10'
    },
    {
        label: 'Blue',
        name: 'blue',
        color: 'bg-blue/15 border-black/[.08] dark:border-white/10'
    },
    {
        label: 'Green',
        name: 'green',
        color: 'bg-green/15 border-black/[.08] dark:border-white/10'
    },
    {
        label: 'Yellow',
        name: 'yellow',
        color: 'bg-yellow/15 border-black/[.08] dark:border-white/10'
    },
    {
        label: 'Red',
        name: 'red',
        color: 'bg-red/15 border-black/[.08] dark:border-white/10'
    }
];

export function CtaCard({
    buttonText,
    buttonUrl,
    buttonColor,
    buttonTextColor,
    color,
    hasSponsorLabel,
    htmlEditor,
    htmlEditorInitialState,
    imageSrc,
    isEditing,
    layout,
    showButton,
    updateButtonText,
    updateButtonUrl,
    updateShowButton,
    updateHasSponsorLabel,
    updateLayout,
    handleColorChange,
    handleButtonColor,
    onFileChange,
    setFileInputRef,
    onRemoveMedia
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
            dataTestId: 'minimal-layout'
        },
        {
            label: 'Immersive',
            name: 'immersive',
            Icon: ImmersiveLayoutIcon,
            dataTestId: 'immersive-layout'
        }
    ];

    const matchingTextColor = (bgColor) => {
        return bgColor === 'transparent' ? '' : textColorForBackgroundColor(bgColor === 'accent' ? getAccentColor() : bgColor).hex();
    };

    const designSettings = (
        <>
            {/* Color picker */}
            <ColorOptionSetting
                buttons={ctaColorPicker}
                label='Background'
                selectedName={color}
                onClick={handleColorChange}
            />
            {/* Layout settings */}
            <ButtonGroupSetting
                buttons={layoutOptions}
                label='Layout'
                selectedName={layout}
                onClick={updateLayout}
            />
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
                icon='file'
                label='Image'
                mimeTypes={['image/*']}
                setFileInputRef={setFileInputRef}
                size='xsmall'
                src={imageSrc}
                onFileChange={onFileChange}
                onRemoveMedia={onRemoveMedia}
            />
            {/* Button settings */}
            <ToggleSetting
                dataTestId="button-settings"
                isChecked={showButton}
                label='Button'
                onChange={updateShowButton}
            />
            {showButton && (
                <>
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
        <>
            <p className="text-sm font-bold tracking-normal text-grey-900 dark:text-grey-300">Web</p>
            <ToggleSetting
                label="Anonymous visitors"
            />
            <ToggleSetting
                label="Free members"
            />
            <ToggleSetting
                label="Paid members"
            />
            <hr className="not-kg-prose my-2 block border-t-grey-300 dark:border-t-grey-900" />
            <p className="text-sm font-bold tracking-normal text-grey-900 dark:text-grey-300">Email</p>
            <ToggleSetting
                label="Free members"
            />
            <ToggleSetting
                label="Paid members"
            />
        </>
    );

    return (
        <>
            <div className={clsx(
                'w-full rounded-lg border',
                CTA_COLORS[color],
                {
                    'py-3': color === 'none' && !hasSponsorLabel,
                    'pb-3': color === 'none' && hasSponsorLabel
                }
            )} data-cta-layout={layout}>
                {/* Sponsor label */}
                {hasSponsorLabel && (
                    <div className={clsx(
                        'not-kg-prose py-3',
                        {'mx-6': color !== 'none'}
                    )}>
                        <p className="font-sans text-2xs font-semibold uppercase leading-8 tracking-normal text-grey-900/40 dark:text-grey-100/40" data-testid="sponsor-label">Sponsored</p>
                    </div>
                )}

                <div className={clsx(
                    'flex gap-6 pt-6',
                    imageSrc && !showButton ? 'pb-8' : 'pb-7',
                    layout === 'immersive' ? 'flex-col' : 'flex-row',
                    color === 'none' || hasSponsorLabel ? 'border-t border-grey-900/15 dark:border-grey-100/20' : '',
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
                            textClassName={clsx(
                                'w-full whitespace-normal text-pretty bg-transparent font-serif text-xl text-grey-900 dark:text-grey-200',
                                layout === 'immersive' ? 'text-center' : 'text-left'
                            )}
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
                                    style={buttonColor ? {
                                        backgroundColor: buttonColor === 'accent' ? 'var(--accent-color)' : buttonColor,
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

CtaCard.propTypes = {
    buttonText: PropTypes.string,
    buttonUrl: PropTypes.string,
    buttonColor: PropTypes.string,
    buttonTextColor: PropTypes.string,
    color: PropTypes.oneOf(['none', 'grey', 'white', 'blue', 'green', 'yellow', 'red']),
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
    onRemoveMedia: PropTypes.func
};

CtaCard.defaultProps = {
    buttonText: '',
    buttonUrl: '',
    buttonColor: '',
    buttonTextColor: '',
    color: 'none',
    hasSponsorLabel: false,
    imageSrc: '',
    isEditing: false,
    layout: 'immersive',
    showButton: false,
    updateHasSponsorLabel: () => {},
    updateShowButton: () => {},
    updateLayout: () => {},
    handleColorChange: () => {},
    handleButtonColor: () => {},
    onFileChange: () => {},
    setFileInputRef: () => {},
    onRemoveMedia: () => {}
};
