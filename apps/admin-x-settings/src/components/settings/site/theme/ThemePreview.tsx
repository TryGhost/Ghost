import Breadcrumbs from '../../../../admin-x-ds/global/Breadcrumbs';
import Button from '../../../../admin-x-ds/global/Button';
import ButtonGroup from '../../../../admin-x-ds/global/ButtonGroup';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import DesktopChrome from '../../../../admin-x-ds/global/chrome/DesktopChrome';
import MobileChrome from '../../../../admin-x-ds/global/chrome/MobileChrome';
import NiceModal from '@ebay/nice-modal-react';
import PageHeader from '../../../../admin-x-ds/global/layout/PageHeader';
import React, {useState} from 'react';
import {OfficialTheme} from '../../../providers/ServiceProvider';
import {Theme} from '../../../../api/themes';

const ThemePreview: React.FC<{
    selectedTheme?: OfficialTheme;
    isInstalling?: boolean;
    installedTheme?: Theme;
    onBack: () => void;
    onClose: () => void;
    onInstall?: () => void | Promise<void>;
}> = ({
    selectedTheme,
    isInstalling,
    installedTheme,
    onBack,
    onClose,
    onInstall
}) => {
    const [previewMode, setPreviewMode] = useState('desktop');

    if (!selectedTheme) {
        return null;
    }

    let installButtonLabel = `Install ${selectedTheme.name}`;

    if (isInstalling) {
        installButtonLabel = 'Installing...';
    } else if (selectedTheme.ref === 'default') {
        installButtonLabel = `Activate ${selectedTheme.name}`;
    } else if (installedTheme) {
        installButtonLabel = `Update ${selectedTheme.name}`;
    }

    const handleInstall = () => {
        if (installedTheme && selectedTheme.ref !== 'default') {
            NiceModal.show(ConfirmationModal, {
                title: 'Overwrite theme',
                prompt: (
                    <>
                        This will overwrite your existing version of {selectedTheme.name}{installedTheme?.active ? ', which is your active theme' : ''}. All custom changes will be lost.
                    </>
                ),
                okLabel: 'Overwrite',
                okRunningLabel: 'Installing...',
                cancelLabel: 'Cancel',
                okColor: 'red',
                onOk: async (confirmModal) => {
                    await onInstall?.();
                    confirmModal?.remove();
                }
            });
        } else {
            onInstall?.();
        }
    };

    const left =
        <div className='flex items-center gap-2'>
            <Breadcrumbs
                activeItemClassName='hidden md:!block md:!visible'
                itemClassName='hidden md:!block md:!visible'
                items={[
                    {label: 'Design', onClick: onClose},
                    {label: 'Change theme', onClick: onBack},
                    {label: selectedTheme.name}
                ]}
                separatorClassName='hidden md:!block md:!visible'
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
                        iconColorClass: (previewMode === 'desktop' ? 'text-black dark:text-green' : 'text-grey-500 dark:text-grey-600'),
                        link: true,
                        size: 'sm',
                        onClick: () => {
                            setPreviewMode('desktop');
                        }
                    },
                    {
                        icon: 'mobile',
                        iconColorClass: (previewMode === 'mobile' ? 'text-black dark:text-green' : 'text-grey-500 dark:text-grey-600'),
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
                disabled={isInstalling}
                label={isInstalling ? 'Installing...' : installButtonLabel}
                onClick={handleInstall}
            />
        </div>;

    return (
        <div className='absolute inset-0 z-[100]'>
            <PageHeader containerClassName='bg-grey-50 dark:bg-black z-[100]' left={left} right={right} sticky={false} />
            <div className='flex h-[calc(100%-74px)] grow flex-col items-center justify-center bg-grey-50 dark:bg-black'>
                {previewMode === 'desktop' ?
                    <DesktopChrome>
                        <iframe className='h-full w-full'
                            src={selectedTheme?.previewUrl} title='Theme preview' />
                    </DesktopChrome>
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
