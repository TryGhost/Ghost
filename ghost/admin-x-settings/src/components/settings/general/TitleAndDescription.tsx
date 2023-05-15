import React from 'react';
import Button, { ButtonColors } from '../../design-system/globals/Button';
import SettingGroup from '../../design-system/settings/SettingGroup';
import SettingGroupHeader from '../../design-system/settings/SettingGroupHeader';

const TitleAndDescription: React.FC = () => {
    return (
        <SettingGroup>
            <div className="flex justify-between items-start">
                
                {/* Header to be created as component */}
                
                <SettingGroupHeader title="Title & description" />

                {/* Setting actions to be created as component */}
                <div>
                    <Button 
                        label="Action"
                        color={ButtonColors.Green}
                        link={true}
                    />
                </div>
            </div>
        </SettingGroup>
    );
}

export default TitleAndDescription;