import ButtonGroup from '../../../../admin-x-ds/global/ButtonGroup';
import DesktopChrome from '../../../../admin-x-ds/global/DesktopChrome';
import React from 'react';
import URLSelect from '../../../../admin-x-ds/global/URLSelect';
import {SelectOption} from '../../../../admin-x-ds/global/Select';

const ThemePreview: React.FC = () => {
    const urlOptions: SelectOption[] = [
        {value: 'homepage', label: 'Homepage'},
        {value: 'post', label: 'Post'}
    ];

    const toolbarCenter = (
        <URLSelect options={urlOptions} onSelect={(value: string) => {
            alert(value);
        }} />
    );

    const toolbarRight = (
        <ButtonGroup
            buttons={[
                {icon: 'laptop', link: true, size: 'sm'},
                {icon: 'mobile', link: true, size: 'sm', iconColorClass: 'text-grey-500'}
            ]}
        />
    );

    return (
        <>
            <DesktopChrome
                chromeClasses='bg-grey-50'
                toolbarCenter={toolbarCenter}
                toolbarClasses='m-2'
                toolbarRight={toolbarRight}
            >
                <div className='flex h-full items-center justify-center bg-grey-50 text-sm text-grey-400'>
                    Preview iframe
                </div>
            </DesktopChrome>
        </>
    );
};

export default ThemePreview;