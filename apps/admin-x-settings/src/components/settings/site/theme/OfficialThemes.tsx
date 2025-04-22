import MarketplaceBgImage from '../../../../assets/images/footer-marketplace-bg.png';
import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import {Heading, ModalPage} from '@tryghost/admin-x-design-system';
import {OfficialTheme, ThemeVariant, useOfficialThemes} from '../../../providers/SettingsAppProvider';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {resolveAsset} from '../../../../utils/helpers';

const VARIANT_LOOP_INTERVAL = 3000;

const hasVariants = (theme: OfficialTheme) => theme.variants && theme.variants.length > 0;

const getAllVariants = (theme: OfficialTheme) : ThemeVariant[] => {
    const variants = [{
        category: theme.category,
        previewUrl: theme.previewUrl,
        image: theme.image
    }];

    if (theme.variants && theme.variants.length > 0) {
        variants.push(...theme.variants);
    }

    return variants;
};

const OfficialThemes: React.FC<{
    onSelectTheme?: (theme: OfficialTheme) => void;
}> = ({
    onSelectTheme
}) => {
    const {adminRoot} = getGhostPaths();
    const officialThemes = useOfficialThemes();

    const [variantLoopTheme, setVariantLoopTheme] = useState<OfficialTheme | null>(null);
    const [visibleVariantIdx, setVisibleVariantIdx] = useState(0);

    const setupVariantLoop = (theme: OfficialTheme | null) => {
        setVariantLoopTheme(theme);
        setVisibleVariantIdx(
            (theme !== null && hasVariants(theme) && getAllVariants(theme).length > 1) ? 1 : 0
        );
    };

    useEffect(() => {
        if (variantLoopTheme === null) {
            return;
        }

        const loopInterval = setInterval(() => {
            setVisibleVariantIdx((visibleVariantIdx + 1) % (getAllVariants(variantLoopTheme).length || 0));
        }, VARIANT_LOOP_INTERVAL);

        return () => clearInterval(loopInterval);
    }, [variantLoopTheme, visibleVariantIdx]);

    return (
        <ModalPage heading='Themes'>
            <div className='mt-[6vmin] grid grid-cols-1 gap-[6vmin] sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'>
                {officialThemes.map((theme) => {
                    const showVariants = hasVariants(theme);
                    const variants = getAllVariants(theme);
                    const isVariantLooping = variantLoopTheme === theme;

                    return (
                        <button key={theme.name} className='flex cursor-pointer flex-col gap-3 text-left' type='button' onClick={() => {
                            onSelectTheme?.(theme);
                        }}>
                            <div className='relative w-full bg-grey-100 shadow-md transition-all duration-500 hover:scale-[1.05]' onMouseEnter={() => setupVariantLoop(theme)} onMouseLeave={() => setupVariantLoop(null)}>
                                {showVariants ?
                                    <>
                                        {variants.map((variant, idx) => (
                                            <img
                                                key={`theme-variant-${variant.category.toLowerCase()}`}
                                                alt={`${theme.name} Theme - ${variant.category}`}
                                                className={clsx('size-full object-contain opacity-0 transition-opacity duration-500', {
                                                    'opacity-100': idx === visibleVariantIdx && isVariantLooping || !isVariantLooping && idx === 0,
                                                    relative: idx === visibleVariantIdx,
                                                    absolute: idx !== visibleVariantIdx,
                                                    'left-0': idx !== visibleVariantIdx,
                                                    'top-0': idx !== visibleVariantIdx
                                                })}
                                                src={resolveAsset(variant.image, adminRoot)}
                                            />
                                        ))}
                                    </> :
                                    <img
                                        alt={`${theme.name} Theme`}
                                        className='size-full object-contain'
                                        src={resolveAsset(theme.image, adminRoot)}
                                    />
                                }
                            </div>
                            <div className='relative mt-3'>
                                <Heading level={4}>{theme.name}</Heading>
                                {showVariants ?
                                    variants.map((variant, idx) => (
                                        <span className={clsx('absolute left-0 translate-y-px text-sm text-grey-700 opacity-0', {
                                            'opacity-100': idx === visibleVariantIdx && isVariantLooping || !isVariantLooping && idx === 0
                                        })}>{variant.category}</span>
                                    )) :
                                    <span className='text-sm text-grey-700'>{theme.category}</span>
                                }
                            </div>
                        </button>
                    );
                })}
            </div>
            <div className='mx-[-8vmin] mb-[-8vmin] mt-[8vmin] bg-black px-[8vmin] py-16 text-center text-lg text-white' style={
                {
                    background: `#15171a url(${MarketplaceBgImage}) 100% 100% / 35vw no-repeat`
                }
            }>
                Find and buy third-party, premium themes from independent developers in the <a className='inline-block font-semibold text-lime' href="https://ghost.org/themes/" rel="noopener noreferrer" target="_blank">Ghost Marketplace &rarr;</a>
            </div>
        </ModalPage>
    );
};

export default OfficialThemes;
