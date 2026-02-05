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
        <div className="w-full rounded-lg border border-grey-300 bg-grey-100 dark:border-grey-900 dark:bg-grey-950">
            <TransistorPlaceholder
                accentColor={accentColor}
                backgroundColor={backgroundColor}
            />
        </div>
    );
}

function TransistorPlaceholder({accentColor, backgroundColor}) {
    const previewStyle = {
        backgroundColor: backgroundColor || '#FFFFFF',
        borderColor: accentColor || '#000000'
    };

    const iconStyle = {
        color: accentColor || '#000000'
    };

    return (
        <div
            className="flex min-h-[180px] items-center justify-center rounded-lg p-8 transition-colors"
            data-testid="transistor-placeholder"
            style={previewStyle}
        >
            <div className="text-center">
                <div className="mb-3 flex justify-center">
                    <TransistorIcon className="size-12" style={iconStyle} />
                </div>
                <div className="mb-2 text-lg font-semibold" style={{color: accentColor || '#000000'}}>
                    Transistor Private Podcast
                </div>
                <div className="text-sm text-grey-700 dark:text-grey-400">
                    Your private RSS feeds
                </div>
            </div>
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

TransistorPlaceholder.propTypes = {
    accentColor: PropTypes.string,
    backgroundColor: PropTypes.string
};
