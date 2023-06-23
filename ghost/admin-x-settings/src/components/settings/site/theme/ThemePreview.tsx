import Breadcrumbs from '../../../../admin-x-ds/global/Breadcrumbs';
import Button from '../../../../admin-x-ds/global/Button';
import ButtonGroup from '../../../../admin-x-ds/global/ButtonGroup';
import MobileChrome from '../../../../admin-x-ds/global/chrome/MobileChrome';
import PageHeader from '../../../../admin-x-ds/global/layout/PageHeader';
import React, {useState} from 'react';
import {OfficialTheme} from '../../../../models/themes';

const ThemePreview: React.FC<{
    selectedTheme?: OfficialTheme;
    onBack: () => void;
    themeInstalled?: boolean;
    installButtonLabel?: string;
    onInstall?: () => void;
}> = ({
    selectedTheme,
    onBack,
    themeInstalled,
    installButtonLabel,
    onInstall
}) => {
    const [previewMode, setPreviewMode] = useState('desktop');

    if (!selectedTheme) {
        return null;
    }

    const left =
        <div className='flex items-center gap-2'>
            <Breadcrumbs
                items={[
                    {label: 'Official themes', onClick: onBack},
                    {label: selectedTheme.name}
                ]}
                backIcon
                onBack={onBack}
            />
        </div>;

    const right =
        <div className='flex justify-end gap-8'>
            <ButtonGroup
                buttons={[
                    {
                        icon: 'laptop',
                        iconColorClass: (previewMode === 'desktop' ? 'text-black' : 'text-grey-500'),
                        link: true,
                        size: 'sm',
                        onClick: () => {
                            setPreviewMode('desktop');
                        }
                    },
                    {
                        icon: 'mobile',
                        iconColorClass: (previewMode === 'mobile' ? 'text-black' : 'text-grey-500'),
                        link: true,
                        size: 'sm',
                        onClick: () => {
                            setPreviewMode('mobile');
                        }
                    }
                ]}
            />
            <Button
                color='green'
                disabled={themeInstalled}
                label={installButtonLabel}
                onClick={onInstall}
            />
        </div>;

    return (
        <div className='absolute inset-0 z-[100]'>
            <PageHeader containerClassName='bg-grey-50 z-[100]' left={left} right={right} sticky={false} />
            <div className='flex h-[calc(100%-74px)] grow flex-col items-center justify-center bg-grey-50'>
                {previewMode === 'desktop' ?
                    <iframe className='h-full w-full'
                        src={selectedTheme?.previewUrl} title='Theme preview' />
                    :
                    <MobileChrome>
                        <iframe className='h-full w-full'
                            src={selectedTheme?.previewUrl} title='Theme preview' />
                    </MobileChrome>
                }
            </div>
        </div>
    );
};

export default ThemePreview;