import PropTypes from 'prop-types';
import React from 'react';
import TransistorIcon from '../../../assets/icons/kg-card-type-transistor.svg?react';
// TODO: Re-enable when design tab is implemented
// import {useState} from 'react';
// import {ColorPickerSetting, SettingsPanel} from '../SettingsPanel.jsx';
// import {VisibilitySettings} from '../VisibilitySettings.jsx';

export function TransistorCard({
    accentColor = '',
    backgroundColor = ''
    // TODO: Re-enable when design tab is implemented
    // isEditing = false,
    // visibilityOptions = {},
    // handleAccentColorChange = () => {},
    // handleBackgroundColorChange = () => {},
    // toggleVisibility = () => {},
    // showVisibilitySettings = false
}) {
    // TODO: Re-enable design tab when color customization is fully implemented
    // const [accentColorPickerExpanded, setAccentColorPickerExpanded] = useState(false);
    // const [backgroundColorPickerExpanded, setBackgroundColorPickerExpanded] = useState(false);

    // const tabs = [
    //     {id: 'design', label: 'Design'},
    //     {id: 'visibility', label: 'Visibility'}
    // ];

    // const designSettings = (
    //     <>
    //         <ColorPickerSetting
    //             dataTestId='transistor-accent-color'
    //             eyedropper={true}
    //             isExpanded={accentColorPickerExpanded}
    //             label='Player color'
    //             swatches={[
    //                 {title: 'Purple', hex: '#8B5CF6'},
    //                 {title: 'Blue', hex: '#3B82F6'},
    //                 {title: 'Green', hex: '#10B981'},
    //                 {title: 'Black', hex: '#000000'}
    //             ]}
    //             value={accentColor || '#000000'}
    //             onPickerChange={color => handleAccentColorChange(color)}
    //             onSwatchChange={(color) => {
    //                 handleAccentColorChange(color);
    //                 setAccentColorPickerExpanded(false);
    //             }}
    //             onTogglePicker={(isExpanded) => {
    //                 setAccentColorPickerExpanded(isExpanded);
    //                 if (isExpanded) {
    //                     setBackgroundColorPickerExpanded(false);
    //                 }
    //             }}
    //         />
    //         <ColorPickerSetting
    //             dataTestId='transistor-background-color'
    //             eyedropper={true}
    //             hasTransparentOption={true}
    //             isExpanded={backgroundColorPickerExpanded}
    //             label='Background'
    //             swatches={[
    //                 {title: 'White', hex: '#FFFFFF'},
    //                 {title: 'Light grey', hex: '#F3F4F6'},
    //                 {title: 'Dark', hex: '#1F2937'},
    //                 {title: 'Black', hex: '#000000'}
    //             ]}
    //             value={backgroundColor || '#FFFFFF'}
    //             onPickerChange={color => handleBackgroundColorChange(color)}
    //             onSwatchChange={(color) => {
    //                 handleBackgroundColorChange(color);
    //                 setBackgroundColorPickerExpanded(false);
    //             }}
    //             onTogglePicker={(isExpanded) => {
    //                 setBackgroundColorPickerExpanded(isExpanded);
    //                 if (isExpanded) {
    //                     setAccentColorPickerExpanded(false);
    //                 }
    //             }}
    //         />
    //     </>
    // );

    return (
        <div className="w-full rounded-lg border border-grey-300 bg-white dark:border-grey-900 dark:bg-grey-950">
            <TransistorPlaceholder />
        </div>
    );
}

function TransistorPlaceholder() {
    return (
        <div
            className="relative flex flex-col items-center gap-6 px-6 py-8"
            data-testid="transistor-placeholder"
        >
            <div className="size-22 flex shrink-0 items-center justify-center rounded-xl bg-accent">
                <TransistorIcon className="size-12 text-white" />
            </div>
            <div className="min-h-22 flex max-w-[480px] flex-col justify-center">
                <div className="text-center text-[2.1rem] font-semibold leading-[-0.08px] text-black dark:text-white">
                    Members-only podcasts
                </div>
                <div className="mt-3 text-center text-[1.4rem] leading-normal text-grey-700 dark:text-grey-500">
                    Your Transistor podcasts will appear here. Members will see subscribe links based on their access level.
                </div>
            </div>
            {/*
            TODO: decide on whether to show Transistor Logo in the Editor
            <div className="absolute bottom-4 right-5 flex items-center gap-1.5 text-grey-500 dark:text-grey-600">
                <TransistorIcon className="size-4" />
                <span className="text-[1.3rem] font-medium">Transistor</span>
            </div> */}
        </div>
    );
}

TransistorCard.propTypes = {
    accentColor: PropTypes.string,
    backgroundColor: PropTypes.string
    // TODO: Re-enable when design tab is implemented
    // isEditing: PropTypes.bool,
    // visibilityOptions: PropTypes.array,
    // handleAccentColorChange: PropTypes.func,
    // handleBackgroundColorChange: PropTypes.func,
    // toggleVisibility: PropTypes.func,
    // showVisibilitySettings: PropTypes.bool
};

TransistorPlaceholder.propTypes = {};
