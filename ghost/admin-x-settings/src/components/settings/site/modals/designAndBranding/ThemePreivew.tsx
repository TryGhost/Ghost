import DesktopChrome from '../../../../../admin-x-ds/global/DesktopChrome';
import React from 'react';

const ThemePreview: React.FC = () => {
    return (
        <>
            <DesktopChrome>
                <div className='flex h-full items-center justify-center bg-grey-50 text-sm text-grey-400'>
                        Preview iframe
                </div>
            </DesktopChrome>
        </>
    );
};

export default ThemePreview;