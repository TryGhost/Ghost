import Heading from '../../../../admin-x-ds/global/Heading';
import React from 'react';

const AdvancedThemeSettings: React.FC = () => {
    return (
        <div className='p-[8vmin] pt-5'>
            <Heading>Installed themes</Heading>
            <div className='mt-5'>
                List of installed themes
            </div>
        </div>
    );
};

export default AdvancedThemeSettings;