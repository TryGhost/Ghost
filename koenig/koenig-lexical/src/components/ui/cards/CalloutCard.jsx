import PropTypes from 'prop-types';
import React from 'react';
import {ColorPickerSetting, SettingsPanel, ToggleSetting} from '../SettingsPanel';

export const CALLOUT_COLORS = {
    grey: 'bg-grey/10 border-transparent',
    white: 'bg-white border-grey/30',
    blue: 'bg-blue/10 border-transparent',
    green: 'bg-green/10 border-transparent',
    yellow: 'bg-yellow/10 border-transparent',
    red: 'bg-red/10 border-transparent',
    pink: 'bg-pink/10 border-transparent',
    purple: 'bg-purple/10 border-transparent'
};

export function CalloutCard({color, emoji, value, placeholder, isEditing}) {
    const calloutColorPicker = [
        {
            label: 'Grey',
            name: 'grey',
            colorClass: 'bg-grey-100'
        },
        {
            label: 'White',
            name: 'white',
            colorClass: 'bg-white'
        },
        {
            label: 'Blue',
            name: 'blue',
            colorClass: 'bg-blue-100'
        },
        {
            label: 'Green',
            name: 'green',
            colorClass: 'bg-green-100'
        },
        {
            label: 'Yellow',
            name: 'yellow',
            colorClass: 'bg-yellow-100'
        },
        {
            label: 'Red',
            name: 'red',
            colorClass: 'bg-red-100'
        },
        {
            label: 'Pink',
            name: 'pink',
            colorClass: 'bg-pink-100'
        },
        {
            label: 'Purple',
            name: 'purple',
            colorClass: 'bg-purple-100'
        },
        {
            label: 'Accent',
            name: 'accent',
            colorClass: 'bg-pink'
        }
    ];

    return (
        <>
            <div className={`flex items-center rounded border py-5 px-7 ${CALLOUT_COLORS[color]} `}>
                {emoji && <button className={`mr-2 h-8 rounded px-2 text-xl ${isEditing ? 'hover:bg-grey-500/20' : ''} ` } type="button">&#128161;</button>}
                <input className="w-full bg-transparent font-serif text-xl font-normal text-black" placeholder={placeholder} value={value} />
            </div>
            {isEditing && (
                <SettingsPanel>
                    <ColorPickerSetting
                        buttons={calloutColorPicker}
                        label='Background color'
                        layout='stacked'
                        selectedName={color}
                    />
                    <ToggleSetting
                        isChecked={emoji}
                        label='Emoji'
                    />
                </SettingsPanel>
            )}
        </>
    );
}

CalloutCard.propTypes = {
    color: PropTypes.oneOf(['grey', 'white', 'blue', 'green', 'yellow', 'red', 'pink', 'purple']),
    value: PropTypes.string,
    placeholder: PropTypes.string
};

CalloutCard.defaultProps = {
    color: 'green'
};
