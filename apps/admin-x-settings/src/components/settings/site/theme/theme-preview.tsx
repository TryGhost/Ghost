import React, {useState} from 'react';
import SettingsBreadcrumbs from '../../settings-breadcrumbs';
import {Button, Field, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {DesktopChrome, MobileChrome, PageHeader} from '@tryghost/admin-x-design-system';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {type OfficialTheme, type ThemeVariant} from '../../../providers/settings-app-provider';
import {type Theme, isDefaultOrLegacyTheme} from '@tryghost/admin-x-framework/api/themes';

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
    const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);

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
            setSelectedVariant(variantOptions[0].value);
        }

        previewUrl = getAllVariants(selectedTheme).find(variant => generateVariantOptionValue(variant) === selectedVariant)?.previewUrl || previewUrl;
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
        // The parent component handles all limit checks and confirmation modals
        onInstall?.();
    };

    const left =
        <div className='flex items-center gap-2'>
            <SettingsBreadcrumbs
                current={selectedTheme.name}
                label='Change theme'
                onBack={onBack}
            />
            {hasVariants(selectedTheme) ?
                <>
                    <span className='hidden md:!visible md:!block'>–</span>
                    <Field className='w-auto'>
                        <FieldLabel className='sr-only'>Theme variant</FieldLabel>
                        <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                            <SelectTrigger aria-label='Theme variant' className='w-auto border-0 bg-transparent shadow-none'><SelectValue /></SelectTrigger>
                            <SelectContent className='min-w-max'>
                                {variantOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                </> : null
            }
        </div>;

    const right =
        <div className='flex justify-end gap-8'>
            <Inline gap='sm'>
                <Button aria-label='Desktop preview' size='icon' type='button' variant='ghost' onClick={() => setPreviewMode('desktop')}>
                    <LucideIcon.Laptop className={previewMode === 'desktop' ? 'text-foreground' : 'text-muted-foreground'} />
                </Button>
                <Button aria-label='Mobile preview' size='icon' type='button' variant='ghost' onClick={() => setPreviewMode('mobile')}>
                    <LucideIcon.Smartphone className={previewMode === 'mobile' ? 'text-foreground' : 'text-muted-foreground'} />
                </Button>
            </Inline>
            <Button
                disabled={isInstalling}
                type='button'
                onClick={handleInstall}
            >
                {isInstalling ? 'Installing...' : installButtonLabel}
            </Button>
        </div>;

    return (
        <div className='absolute inset-0 z-[100]'>
            <PageHeader containerClassName='bg-grey-50 dark:bg-black z-[100]' left={left} right={right} sticky={false} />
            <div className='flex h-[calc(100%-92px)] grow flex-col items-center justify-center bg-grey-50 dark:bg-black'>
                {previewMode === 'desktop' ?
                    <DesktopChrome>
                        <iframe
                            className='size-full'
                            src={previewUrl}
                            title='Theme preview'
                        />
                    </DesktopChrome>
                    :
                    <MobileChrome>
                        <iframe
                            className='size-full'
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
