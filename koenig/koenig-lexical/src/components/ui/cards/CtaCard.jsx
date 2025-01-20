import CenterAlignIcon from '../../../assets/icons/kg-align-center.svg?react';
import KoenigNestedEditor from '../../KoenigNestedEditor';
import LeftAlignIcon from '../../../assets/icons/kg-align-left.svg?react';
import PropTypes from 'prop-types';
import React from 'react';
import ReplacementStringsPlugin from '../../../plugins/ReplacementStringsPlugin';
import {Button} from '../Button';
import {ButtonGroupSetting, InputSetting, InputUrlSetting, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';

export function CtaCard({
    buttonText,
    buttonUrl,
    hasBackground,
    hasImage,
    hasSponsorLabel,
    htmlEditor,
    htmlEditorInitialState,
    isEditing,
    layout,
    showButton,
    updateButtonText,
    updateButtonUrl,
    updateShowButton,
    updateHasBackground,
    updateHasSponsorLabel,
    updateHasImage,
    updateLayout
}) {
    const layoutOptions = [
        {
            label: 'Minimal',
            name: 'minimal',
            Icon: LeftAlignIcon,
            dataTestId: 'left-align'
        },
        {
            label: 'Immersive',
            name: 'immersive',
            Icon: CenterAlignIcon,
            dataTestId: 'immersive'
        }
    ];

    return (
        <>
            <div className={`w-full ${hasBackground ? 'rounded-lg bg-grey-100 dark:bg-grey-900' : ''}`}>
                {/* Sponsor label */}
                {hasSponsorLabel && (
                    <div className={`not-kg-prose py-3 ${hasBackground ? 'mx-5' : ''}`}>
                        <p className="font-sans text-2xs font-semibold uppercase leading-8 tracking-normal text-grey dark:text-grey-800">Sponsored</p>
                    </div>
                )}

                <div className={`flex ${layout === 'immersive' ? 'flex-col' : 'flex-row'} gap-5 py-5 ${hasSponsorLabel || !hasBackground ? 'border-t border-grey-300 dark:border-grey-800' : ''} ${hasBackground ? 'mx-5' : 'border-b border-grey-300 dark:border-grey-800'}`}>
                    {hasImage && (
                        <div className={`block ${layout === 'immersive' ? 'w-full' : 'w-16 shrink-0'}`}>
                            <img alt="Placeholder" className={`${layout === 'immersive' ? 'h-auto w-full' : 'aspect-square w-16 object-cover'} rounded-md`} src="https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=4431&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" />
                        </div>
                    )}
                    <div className="flex flex-col gap-5">
                        {/* HTML content */}
                        <KoenigNestedEditor
                            autoFocus={true}
                            hasSettingsPanel={true}
                            initialEditor={htmlEditor}
                            initialEditorState={htmlEditorInitialState}
                            nodes='basic'
                            placeholderClassName={`bg-transparent whitespace-normal font-serif text-xl !text-grey-500 !dark:text-grey-800 ` }
                            placeholderText="Write something worth clicking..."
                            textClassName={`w-full bg-transparent whitespace-normal font-serif text-xl text-grey-900 dark:text-grey-200 ${layout === 'immersive' ? 'text-center' : 'text-left'}`}
                        >
                            <ReplacementStringsPlugin />
                        </KoenigNestedEditor>

                        {/* Button */}
                        { (showButton && (isEditing || (buttonText && buttonUrl))) &&
                            <div>
                                <Button 
                                    color={'accent'} 
                                    dataTestId="cta-button" 
                                    placeholder="Add button text" 
                                    size={layout === 'immersive' ? 'medium' : 'small'}
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
                <SettingsPanel>
                    {/* Layout settings */}
                    <ButtonGroupSetting
                        buttons={layoutOptions}
                        label='Layout'
                        selectedName={layout}
                        onClick={updateLayout}
                    />
                    {/* Background setting */}
                    <ToggleSetting
                        isChecked={hasBackground}
                        label='Background'
                        onChange={updateHasBackground}
                    />
                    {/* Sponsor label setting */}
                    <ToggleSetting
                        isChecked={hasSponsorLabel}
                        label='Sponsor label'
                        onChange={updateHasSponsorLabel}
                    />
                    {/* Image setting */}
                    <ToggleSetting
                        isChecked={hasImage}
                        label='Image'
                        onChange={updateHasImage}
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
                </SettingsPanel>
            )}
        </>
    );
}

CtaCard.propTypes = {
    buttonText: PropTypes.string,
    buttonUrl: PropTypes.string,
    hasBackground: PropTypes.bool,
    hasImage: PropTypes.bool,
    hasSponsorLabel: PropTypes.bool,
    isEditing: PropTypes.bool,
    layout: PropTypes.oneOf(['minimal', 'immersive']),
    showButton: PropTypes.bool,
    htmlEditor: PropTypes.object,
    htmlEditorInitialState: PropTypes.object,
    updateButtonText: PropTypes.func,
    updateButtonUrl: PropTypes.func,
    updateHasBackground: PropTypes.func,
    updateHasSponsorLabel: PropTypes.func,
    updateHasImage: PropTypes.func,
    updateShowButton: PropTypes.func,
    updateLayout: PropTypes.func
};

CtaCard.defaultProps = {
    buttonText: '',
    buttonUrl: '',
    hasBackground: false,
    hasImage: false,
    hasSponsorLabel: false,
    isEditing: false,
    layout: 'immersive',
    showButton: false,
    updateHasBackground: () => {},
    updateHasSponsorLabel: () => {},
    updateHasImage: () => {},
    updateShowButton: () => {},
    updateLayout: () => {}
};
