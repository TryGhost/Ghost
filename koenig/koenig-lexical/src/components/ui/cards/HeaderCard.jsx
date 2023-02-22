import React from 'react';
import PropTypes from 'prop-types';
import {Button} from '../Button';
import {SettingsPanel, ToggleSetting, InputSetting, ButtonGroupSetting, ColorPickerSetting, SettingsDivider} from '../SettingsPanel';

export const HEADER_COLORS = {
    dark: 'bg-black',
    light: 'bg-grey-100',
    accent: 'bg-pink'
};

export function HeaderCard({isEditing, size, backgroundColor, heading, headingPlaceholder, subHeading, subHeadingPlaceholder, button, buttonText, buttonPlaceholder, buttonUrl}) {
    const buttonGroupChildren = [
        {
            label: 'S',
            name: 'S'
        },
        {
            label: 'M',
            name: 'M'
        },
        {
            label: 'L',
            name: 'L'
        }
    ];

    const colorPickerChildren = [
        {
            label: 'Dark',
            name: 'dark',
            color: 'black'
        },
        {
            label: 'Light',
            name: 'light',
            color: 'grey-50'
        },
        {
            label: 'Accent',
            name: 'accent',
            color: 'pink'
        }
    ];

    return (
        <>
            <div className={`flex flex-col items-center justify-center text-center font-sans ${(size === 'S') ? 'min-h-[40vh] py-[14vmin]' : (size === 'M') ? 'min-h-[60vh] py-[12vmin]' : 'min-h-[80vh] py-[18vmin]'} ${HEADER_COLORS[backgroundColor]} `}>
                { (isEditing || heading) && <h2 className={`font-extrabold leading-tight ${(size === 'S') ? 'text-6xl' : (size === 'M') ? 'text-7xl' : 'text-8xl'} ${(backgroundColor === 'light') ? 'text-black' : 'text-white'} ${heading || 'opacity-50'}`}>{heading || headingPlaceholder}</h2>}
                { (isEditing || subHeading) && <h3 className={`w-full font-normal ${(size === 'S') ? 'mt-2 text-2xl' : (size === 'M') ? 'mt-3 text-[2.7rem]' : 'mt-3 text-3xl'} ${(backgroundColor === 'light') ? 'text-black' : 'text-white'} ${subHeading || 'opacity-50'}`}>{subHeading || subHeadingPlaceholder}</h3>}
                { (button && (isEditing || (buttonText && buttonUrl))) && 
                <div className={`${(size === 'S') ? 'mt-6' : (size === 'M') ? 'mt-8' : 'mt-10'}`}>
                    {((button && (backgroundColor === 'light')) && <Button value={buttonText} placeholder={buttonPlaceholder} size={size} />) || (button && <Button value={buttonText} placeholder={buttonPlaceholder} size={size} color='light' />)}
                </div>
                }
            </div>

            {isEditing && (
                <SettingsPanel>
                    <ButtonGroupSetting
                        label='Size'
                        selectedName={size}
                        buttons={buttonGroupChildren}
                    />
                    <ColorPickerSetting
                        label='Style'
                        selectedName={backgroundColor}
                        buttons={colorPickerChildren}
                    />
                    <SettingsDivider />
                    <ToggleSetting
                        label='Button'
                        isChecked={button}
                    />
                    {button && (
                        <>
                            <InputSetting
                                label='Button text'
                                placeholder='Add button text'
                                value={buttonText}
                            />
                            <InputSetting
                                label='Button URL'
                                placeholder='https://yoursite.com/#/portal/signup/'
                                value={buttonUrl}
                            />
                        </>
                    )}
                </SettingsPanel>    
            )}
        </>
    );
}

HeaderCard.propTypes = {
    size: PropTypes.oneOf(['S', 'M', 'L']),
    backgroundColor: PropTypes.oneOf(['dark', 'light', 'accent']),
    heading: PropTypes.string,
    headingPlaceholder: PropTypes.string,
    subHeading: PropTypes.string,
    subHeadingPlaceholder: PropTypes.string,
    button: PropTypes.bool,
    buttonText: PropTypes.string,
    buttonPlaceholder: PropTypes.string
};