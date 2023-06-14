import Heading from '../../../../admin-x-ds/global/Heading';
import React from 'react';
import {OfficialTheme} from '../../../../models/themes';
import {getGhostPaths} from '../../../../utils/helpers';

const OfficialThemes: React.FC<{
    onSelectTheme?: (theme: OfficialTheme) => void;
}> = ({
    onSelectTheme
}) => {
    const {assetRoot} = getGhostPaths();
    const officialThemes: OfficialTheme[] = [{
        name: 'Casper',
        category: 'Blog',
        previewUrl: 'https://demo.ghost.io/',
        ref: 'default',
        image: 'img/themes/Casper.png'
    }, {
        name: 'Headline',
        category: 'News',
        url: 'https://github.com/TryGhost/Headline',
        previewUrl: 'https://headline.ghost.io',
        ref: 'TryGhost/Headline',
        image: 'img/themes/Headline.png'
    }, {
        name: 'Edition',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Edition',
        previewUrl: 'https://edition.ghost.io/',
        ref: 'TryGhost/Edition',
        image: 'img/themes/Edition.png'
    }, {
        name: 'Solo',
        category: 'Blog',
        url: 'https://github.com/TryGhost/Solo',
        previewUrl: 'https://solo.ghost.io',
        ref: 'TryGhost/Solo',
        image: 'img/themes/Solo.png'
    }, {
        name: 'Taste',
        category: 'Blog',
        url: 'https://github.com/TryGhost/Taste',
        previewUrl: 'https://taste.ghost.io',
        ref: 'TryGhost/Taste',
        image: 'img/themes/Taste.png'
    }, {
        name: 'Episode',
        category: 'Podcast',
        url: 'https://github.com/TryGhost/Episode',
        previewUrl: 'https://episode.ghost.io',
        ref: 'TryGhost/Episode',
        image: 'img/themes/Episode.png'
    }, {
        name: 'Digest',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Digest',
        previewUrl: 'https://digest.ghost.io/',
        ref: 'TryGhost/Digest',
        image: 'img/themes/Digest.png'
    }, {
        name: 'Bulletin',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Bulletin',
        previewUrl: 'https://bulletin.ghost.io/',
        ref: 'TryGhost/Bulletin',
        image: 'img/themes/Bulletin.png'
    }, {
        name: 'Alto',
        category: 'Blog',
        url: 'https://github.com/TryGhost/Alto',
        previewUrl: 'https://alto.ghost.io',
        ref: 'TryGhost/Alto',
        image: 'img/themes/Alto.png'
    }, {
        name: 'Dope',
        category: 'Magazine',
        url: 'https://github.com/TryGhost/Dope',
        previewUrl: 'https://dope.ghost.io',
        ref: 'TryGhost/Dope',
        image: 'img/themes/Dope.png'
    }, {
        name: 'Wave',
        category: 'Podcast',
        url: 'https://github.com/TryGhost/Wave',
        previewUrl: 'https://wave.ghost.io',
        ref: 'TryGhost/Wave',
        image: 'img/themes/Wave.png'
    }, {
        name: 'Edge',
        category: 'Photography',
        url: 'https://github.com/TryGhost/Edge',
        previewUrl: 'https://edge.ghost.io',
        ref: 'TryGhost/Edge',
        image: 'img/themes/Edge.png'
    }, {
        name: 'Dawn',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Dawn',
        previewUrl: 'https://dawn.ghost.io/',
        ref: 'TryGhost/Dawn',
        image: 'img/themes/Dawn.png'
    }, {
        name: 'Ease',
        category: 'Documentation',
        url: 'https://github.com/TryGhost/Ease',
        previewUrl: 'https://ease.ghost.io',
        ref: 'TryGhost/Ease',
        image: 'img/themes/Ease.png'
    }, {
        name: 'Ruby',
        category: 'Magazine',
        url: 'https://github.com/TryGhost/Ruby',
        previewUrl: 'https://ruby.ghost.io',
        ref: 'TryGhost/Ruby',
        image: 'img/themes/Ruby.png'
    }, {
        name: 'London',
        category: 'Photography',
        url: 'https://github.com/TryGhost/London',
        previewUrl: 'https://london.ghost.io',
        ref: 'TryGhost/London',
        image: 'img/themes/London.png'
    }, {
        name: 'Journal',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Journal',
        previewUrl: 'https://journal.ghost.io/',
        ref: 'TryGhost/Journal',
        image: 'img/themes/Journal.png'
    }];

    return (
        <div className='p-[8vmin] pt-5'>
            <Heading>Themes</Heading>
            <div className='mt-[6vmin] grid grid-cols-1 gap-[6vmin] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
                {officialThemes.map((theme) => {
                    return (
                        <div key={theme.name} className='flex cursor-pointer flex-col gap-3' onClick={() => {
                            onSelectTheme?.(theme);
                        }}>
                            {/* <img alt={theme.name} src={`${assetRoot}/${theme.image}`}/> */}
                            <div className='h-[420px] w-full bg-grey-100 shadow-md transition-all duration-500 hover:scale-[1.05]'>
                                <img
                                    alt="Headline Theme"
                                    className='w-full object-contain'
                                    src={`${assetRoot}/${theme.image}`}
                                />
                            </div>
                            <div className='mt-3'>
                                <Heading level={4}>{theme.name}</Heading>
                                <span className='text-sm text-grey-700'>{theme.category}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OfficialThemes;