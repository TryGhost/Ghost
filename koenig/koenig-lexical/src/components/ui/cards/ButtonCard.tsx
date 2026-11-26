import CenterAlignIcon from '../../../assets/icons/kg-align-center.svg?react';
import LeftAlignIcon from '../../../assets/icons/kg-align-left.svg?react';
import React from 'react';
import {Button} from '../Button';
import {ButtonGroupSetting, InputSetting, InputUrlSetting, SettingsPanel} from '../SettingsPanel';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';

interface ButtonCardProps {
    alignment?: string;
    buttonText?: string;
    buttonPlaceholder?: string;
    buttonUrl?: string;
    handleAlignmentChange: (name: string) => void;
    handleButtonTextChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleButtonUrlChange: (value: string) => void;
    isEditing?: boolean;
    visibilitySettings?: React.ReactNode;
    showVisibilitySettings?: boolean;
}

export function ButtonCard({
    alignment,
    buttonText,
    buttonPlaceholder,
    buttonUrl,
    handleAlignmentChange,
    handleButtonTextChange,
    handleButtonUrlChange,
    isEditing,
    visibilitySettings = null,
    showVisibilitySettings = false
}: ButtonCardProps) {
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

    const contentSettings = (
        <>
            <ButtonGroupSetting
                buttons={buttonGroupChildren}
                label="Content alignment"
                selectedName={alignment || ''}
                onClick={handleAlignmentChange}
            />
            <InputSetting
                dataTestId="button-input-text"
                label='Button text'
                placeholder='Add button text'
                value={buttonText}
                onChange={handleButtonTextChange}
            />
            <InputUrlSetting
                dataTestId="button-input-url"
                label='Button URL'
                value={buttonUrl || ''}
                onChange={handleButtonUrlChange}
            />
        </>
    );

    return (
        <>
            <div className="inline-block w-full">
                <div className={`my-3 flex items-center ${isEditing || buttonUrl ? 'opacity-100' : 'opacity-50'} ${alignment === 'left' ? 'justify-start' : 'justify-center'} `} data-testid="button-card">
                    <Button dataTestId="button-card-btn" href={buttonUrl} placeholder={buttonPlaceholder} shrink={true} value={buttonText} />
                </div>
            </div>
            <ReadOnlyOverlay />
            {isEditing && (
                <SettingsPanel
                    settingsLabel="Content"
                    showVisibilitySettings={showVisibilitySettings}
                    visibilitySettings={visibilitySettings}
                >
                    {contentSettings}
                </SettingsPanel>
            )}
        </>
    );
}
