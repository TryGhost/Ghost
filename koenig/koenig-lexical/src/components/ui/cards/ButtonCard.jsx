import PropTypes from 'prop-types';
import React from 'react';
import {Button} from '../Button';
import {ButtonGroupSetting, InputSetting, SettingsPanel} from '../SettingsPanel';
import {ReactComponent as CenterAlignIcon} from '../../../assets/icons/kg-align-center.svg';
import {ReactComponent as LeftAlignIcon} from '../../../assets/icons/kg-align-left.svg';

export function ButtonCard({
    isEditing, 
    buttonText, 
    buttonPlaceholder, 
    buttonUrl, 
    alignment
}) {
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

    return (
        <>
            <div className="inline-block w-full">
                <div className={`my-3 flex h-10 items-center ${isEditing || buttonUrl ? 'opacity-100' : 'opacity-50'} ${alignment === 'left' ? 'justify-start' : 'justify-center'} `}>
                    <Button value={buttonText} placeholder={buttonPlaceholder} />
                </div>
            </div>
            {isEditing && (
                <SettingsPanel>
                    <ButtonGroupSetting
                        label="Content alignment"
                        selectedName={alignment}
                        buttons={buttonGroupChildren}
                    />
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
                </SettingsPanel>    
            )}
        </>
    );
}

ButtonCard.propTypes = {
    buttonText: PropTypes.string,
    buttonPlaceholder: PropTypes.string, 
    buttonUrl: PropTypes.string
};