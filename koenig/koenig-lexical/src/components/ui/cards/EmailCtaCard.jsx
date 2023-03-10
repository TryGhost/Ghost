import PropTypes from 'prop-types';
import React from 'react';
import {Button} from '../Button';
import {ButtonGroupSetting, DropdownSetting, InputSetting, SettingsDivider, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {ReactComponent as CenterAlignIcon} from '../../../assets/icons/kg-align-center.svg';
import {ReactComponent as LeftAlignIcon} from '../../../assets/icons/kg-align-left.svg';

export function EmailCtaCard({isEditing, visibility, alignment, separators, value, placeholder, button, buttonText, buttonUrl}) {
    const buttonGroupChildren = [
        {
            label: 'Left',
            name: 'left',
            Icon: LeftAlignIcon
        },
        {
            label: 'Center',
            name: 'center',
            Icon: CenterAlignIcon
        }
    ];

    const dropdownOptions = ['Free members', 'Paid members'];

    return (
        <>
            <div className="pb-6">
                <div className="pt-1 pb-7 font-sans text-xs font-semibold uppercase leading-8 tracking-tight text-grey">
                    {visibility}
                </div>
                {separators && <hr className="-mt-4 mb-12 block border-t-grey-300" />}
                <input className={`w-full font-serif text-xl text-grey-900 ${alignment === 'left' ? 'text-left' : 'text-center'} ` } value={value} placeholder={placeholder} />
                { (button && (isEditing || (buttonText && buttonUrl))) && 
                <div className={`mt-6 ${alignment === 'left' ? 'text-left' : 'text-center'} ` }>
                    <Button placeholder="Add button text" value={buttonText} />
                </div>    
                }
                {separators && <hr className="mt-12 mb-0 block border-t-grey-300" />}

            </div>

            {isEditing && (
                <SettingsPanel>
                    <DropdownSetting
                        label='Visibility'
                        description='Visible for this audience when delivered by email. This card is not published on your site.'
                        trigger={visibility}
                        menu={dropdownOptions}
                    />
                    <SettingsDivider />
                    <ButtonGroupSetting
                        label='Content alignment'
                        selectedName={alignment}
                        buttons={buttonGroupChildren}
                    />
                    <ToggleSetting
                        label='Separators'
                        isChecked={separators}
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

EmailCtaCard.propTypes = {
    visibility: PropTypes.oneOf(['Free members', 'Paid members']),
    alignment: PropTypes.oneOf(['left', 'center']),
    separators: PropTypes.bool,
    value: PropTypes.string,
    placeholder: PropTypes.string,
    button: PropTypes.bool,
    buttonText: PropTypes.string,
    buttonUrl: PropTypes.string
};