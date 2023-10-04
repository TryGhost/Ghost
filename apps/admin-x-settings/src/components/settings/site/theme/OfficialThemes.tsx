import Heading from '../../../../admin-x-ds/global/Heading';
import MarketplaceBgImage from '../../../../assets/images/footer-marketplace-bg.png';
import ModalPage from '../../../../admin-x-ds/global/modal/ModalPage';
import React, {useEffect, useState} from 'react';
import {OfficialTheme, useOfficialThemes} from '../../../providers/ServiceProvider';
import {getGhostPaths, resolveAsset} from '../../../../utils/helpers';

const sourceDemos = [
    {image: 'Source.png', category: 'News'},
    {image: 'Source-Magazine.png', category: 'Magazine'},
    {image: 'Source-Newsletter.png', category: 'Newsletter'}
];

const OfficialThemes: React.FC<{
    onSelectTheme?: (theme: OfficialTheme) => void;
}> = ({
    onSelectTheme
}) => {
    const {adminRoot} = getGhostPaths();
    const officialThemes = useOfficialThemes();
    const [currentSourceDemoIndex, setCurrentSourceDemoIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const switchSourceDemos = () => {
            if (isHovered) {
                setCurrentSourceDemoIndex(prevIndex => (prevIndex + 1) % sourceDemos.length);
            }
        };

        switchSourceDemos();

        const interval = setInterval(() => {
            switchSourceDemos();
        }, 3000);

        return () => {
            clearInterval(interval);
        };
    }, [isHovered]);

    useEffect(() => {
        if (!isHovered) {
            setCurrentSourceDemoIndex(0);
        }
    }, [isHovered]);

    return (
        <ModalPage heading='Themes'>
            <div className='mt-[6vmin] grid grid-cols-1 gap-[6vmin] sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'>
                {officialThemes.map((theme) => {
                    return (
                        <button key={theme.name} className='flex cursor-pointer flex-col gap-3 text-left' type='button' onClick={() => {
                            onSelectTheme?.(theme);
                        }}>
                            {/* <img alt={theme.name} src={`${assetRoot}/${theme.image}`}/> */}
                            <div className='relative w-full bg-grey-100 shadow-md transition-all duration-500 hover:scale-[1.05]' onMouseEnter={() => theme.name === 'Source' && setIsHovered(true)} onMouseLeave={() => theme.name === 'Source' && setIsHovered(false)}>
                                {theme.name !== 'Source' ?
                                    <img
                                        alt={`${theme.name} Theme`}
                                        className='h-full w-full object-contain'
                                        src={resolveAsset(theme.image, adminRoot)}
                                    /> :
                                    <>
                                        {sourceDemos.map((demo, index) => (
                                            <img
                                                key={`source-theme-${demo.category}`}
                                                alt={`${theme.name} Theme - ${demo.category}`}
                                                className={`${index === 0 ? 'relative' : 'absolute'} left-0 top-0 h-full w-full object-contain transition-opacity duration-500 ${index === currentSourceDemoIndex ? 'opacity-100' : 'opacity-0'}`}
                                                src={resolveAsset(`assets/img/themes/${demo.image}`, adminRoot)}
                                            />
                                        ))}
                                    </>
                                }
                            </div>
                            <div className='relative mt-3'>
                                <Heading level={4}>{theme.name}</Heading>
                                {theme.name !== 'Source' ?
                                    <span className='text-sm text-grey-700'>{theme.category}</span> :
                                    sourceDemos.map((demo, index) => (
                                        <span className={`${index === 0 ? 'absolute' : 'absolute'} left-0 translate-y-px text-sm text-grey-700 ${index === currentSourceDemoIndex ? 'opacity-100' : 'opacity-0'}`}>{demo.category}</span>
                                    ))
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
