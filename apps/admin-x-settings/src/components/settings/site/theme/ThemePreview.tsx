import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {Breadcrumbs, Button, ButtonGroup, ConfirmationModal, DesktopChrome, MobileChrome, PageHeader, Select, SelectOption} from '@tryghost/admin-x-design-system';
import {OfficialTheme, ThemeVariant} from '../../../providers/SettingsAppProvider';
import {Theme, isDefaultOrLegacyTheme} from '@tryghost/admin-x-framework/api/themes';

const hasVariants = (theme: OfficialTheme) => theme.variants && theme.variants.length > 0;

const getAllVariants = (theme: OfficialTheme) : ThemeVariant[] => {
    const variants = [{
        image: theme.image,
        category: theme.category,
        previewUrl: theme.previewUrl
    }];

    if (theme.variants && theme.variants.length > 0) {
        variants.push(...theme.variants);
    }

    return variants;
};

const generateVariantOptionValue = (variant: ThemeVariant) => variant.category.toLowerCase();

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
    onInstall
}) => {
    const [previewMode, setPreviewMode] = useState('desktop');
    const [selectedVariant, setSelectedVariant] = useState<SelectOption | undefined>(undefined);

    if (!selectedTheme) {
        return null;
    }

    let previewUrl = selectedTheme.previewUrl;

    const variantOptions = getAllVariants(selectedTheme).map((variant) => {
        return {
            label: variant.category,
            value: generateVariantOptionValue(variant)
        };
    });

    if (hasVariants(selectedTheme)) {
        if (selectedVariant === undefined) {
            setSelectedVariant(variantOptions[0]);
        }

        previewUrl = getAllVariants(selectedTheme).find(variant => generateVariantOptionValue(variant) === selectedVariant?.value)?.previewUrl || previewUrl;
    }

    let installButtonLabel = `Install ${selectedTheme.name}`;

    if (isInstalling) {
        installButtonLabel = 'Installing...';
    } else if (isDefaultOrLegacyTheme(selectedTheme) && !installedTheme?.active) {
        installButtonLabel = `Activate ${selectedTheme.name}`;
    } else if (installedTheme) {
        installButtonLabel = `Update ${selectedTheme.name}`;
    }

    const handleInstall = () => {
        if (installedTheme && !isDefaultOrLegacyTheme(selectedTheme)) {
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
                containerClassName='whitespace-nowrap'
                itemClassName='hidden md:!block md:!visible'
                items={[
                    {label: 'Change theme', onClick: onBack},
                    {label: selectedTheme.name}
                ]}
                separatorClassName='hidden md:!block md:!visible'
                backIcon
                onBack={onBack}
            />
            {hasVariants(selectedTheme) ?
                <>
                    <span className='hidden md:!visible md:!block'>–</span>
                    <Select
                        border={false}
                        containerClassName='text-sm font-bold'
                        controlClasses={{menu: 'w-24'}}
                        fullWidth={false}
                        options={variantOptions}
                        selectedOption={selectedVariant}
                        clearBg
                        onSelect={(option) => {
                            setSelectedVariant(option || undefined);
                        }}
                    />
                </> : null
            }
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
            <div className='flex h-[calc(100%-92px)] grow flex-col items-center justify-center bg-grey-50 dark:bg-black'>
                {previewMode === 'desktop' ?
                    <DesktopChrome>
                        <iframe
                            className='h-full w-full'
                            src={previewUrl}
                            title='Theme preview'
                        />
                    </DesktopChrome>
                    :
                    <MobileChrome>
                        <iframe
                            className='h-full w-full'
                            src={previewUrl}
                            title='Theme preview'
                        />
                    </MobileChrome>
                }
            </div>
        </div>
    );
};

export default ThemePreview;
