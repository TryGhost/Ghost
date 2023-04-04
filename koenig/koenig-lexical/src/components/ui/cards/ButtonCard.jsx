import PropTypes from 'prop-types';
import React from 'react';
import {Button} from '../Button';
import {ButtonGroupSetting, InputListSetting, InputSetting, SettingsPanel} from '../SettingsPanel';
import {ReactComponent as CenterAlignIcon} from '../../../assets/icons/kg-align-center.svg';
import {ReactComponent as LeftAlignIcon} from '../../../assets/icons/kg-align-left.svg';

export function ButtonCard({
    alignment,
    buttonText, 
    buttonPlaceholder, 
    buttonUrl, 
    handleAlignmentChange,
    handleButtonTextChange,
    handleButtonUrlChange,
    isEditing
}) {
    const buttonGroupChildren = [
        {
            label: 'Left',
            name: 'left',
            Icon: LeftAlignIcon,
            dataTestId: 'button-align-left'
        },
        {
            label: 'Center',
            name: 'center',
            Icon: CenterAlignIcon,
            dataTestId: 'button-align-center'
        }
    ];

    const testListOptions = [
        {value: 'Homepage'},{value: 'Free signup'}
    ];

    return (
        <>
            <div className="inline-block w-full">
                <div className={`my-3 flex h-10 items-center ${isEditing || buttonUrl ? 'opacity-100' : 'opacity-50'} ${alignment === 'left' ? 'justify-start' : 'justify-center'} `} data-testid="button-card">
                    <Button dataTestId="button-card-btn" href={buttonUrl} placeholder={buttonPlaceholder} value={buttonText} />
                </div>
            </div>
            {isEditing && (
                <SettingsPanel>
                    <ButtonGroupSetting
                        buttons={buttonGroupChildren}
                        label="Content alignment"
                        selectedName={alignment}
                        onClick={handleAlignmentChange}
                    />
                    <InputSetting
                        dataTestId="button-input-text"
                        label='Button text'
                        placeholder='Add button text'
                        value={buttonText}
                        onChange={handleButtonTextChange}
                    />
                    <InputListSetting
                        dataTestId="button-input-url"
                        label='Button URL'
                        list='suggestedUrls'
                        listOptions={testListOptions}
                        placeholder='https://yoursite.com/#/portal/signup/'
                        value={buttonUrl}
                        onChange={handleButtonUrlChange}
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