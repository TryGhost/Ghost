import React from 'react';
import {OfficialTheme} from '../../../../models/themes';

const NewThemePreview: React.FC<{
    selectedTheme?: OfficialTheme;
}> = ({
    selectedTheme
}) => {
    if (!selectedTheme) {
        return null;
    }
    return (
        <div className='flex h-full grow flex-col'>
            <iframe className='h-full w-full'
                src={selectedTheme?.previewUrl} title='Theme preview' />
        </div>
    );
};

export default NewThemePreview;