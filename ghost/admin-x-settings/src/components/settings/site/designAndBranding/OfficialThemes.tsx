import Heading from '../../../../admin-x-ds/global/Heading';
import React from 'react';

const OfficialThemes: React.FC<{
    onSelectTheme?: (theme: string) => void;
}> = ({
    onSelectTheme
}) => {
    const officialThemes = [{
        name: 'Casper',
        category: 'Blog',
        previewUrl: 'https://demo.ghost.io/',
        ref: 'default',
        image: 'assets/images/themes/Casper.png'
    }, {
        name: 'Headline',
        category: 'News',
        url: 'https://github.com/TryGhost/Headline',
        previewUrl: 'https://headline.ghost.io',
        ref: 'TryGhost/Headline',
        image: 'assets/images/themes/Headline.png'
    }, {
        name: 'Edition',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Edition',
        previewUrl: 'https://edition.ghost.io/',
        ref: 'TryGhost/Edition',
        image: 'assets/images/themes/Edition.png'
    }, {
        name: 'Solo',
        category: 'Blog',
        url: 'https://github.com/TryGhost/Solo',
        previewUrl: 'https://solo.ghost.io',
        ref: 'TryGhost/Solo',
        image: 'assets/images/themes/Solo.png'
    }, {
        name: 'Taste',
        category: 'Blog',
        url: 'https://github.com/TryGhost/Taste',
        previewUrl: 'https://taste.ghost.io',
        ref: 'TryGhost/Taste',
        image: 'assets/images/themes/Taste.png'
    }, {
        name: 'Episode',
        category: 'Podcast',
        url: 'https://github.com/TryGhost/Episode',
        previewUrl: 'https://episode.ghost.io',
        ref: 'TryGhost/Episode',
        image: 'assets/images/themes/Episode.png'
    }, {
        name: 'Digest',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Digest',
        previewUrl: 'https://digest.ghost.io/',
        ref: 'TryGhost/Digest',
        image: 'assets/images/themes/Digest.png'
    }, {
        name: 'Bulletin',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Bulletin',
        previewUrl: 'https://bulletin.ghost.io/',
        ref: 'TryGhost/Bulletin',
        image: 'assets/images/themes/Bulletin.png'
    }, {
        name: 'Alto',
        category: 'Blog',
        url: 'https://github.com/TryGhost/Alto',
        previewUrl: 'https://alto.ghost.io',
        ref: 'TryGhost/Alto',
        image: 'assets/images/themes/Alto.png'
    }, {
        name: 'Dope',
        category: 'Magazine',
        url: 'https://github.com/TryGhost/Dope',
        previewUrl: 'https://dope.ghost.io',
        ref: 'TryGhost/Dope',
        image: 'assets/images/themes/Dope.png'
    }, {
        name: 'Wave',
        category: 'Podcast',
        url: 'https://github.com/TryGhost/Wave',
        previewUrl: 'https://wave.ghost.io',
        ref: 'TryGhost/Wave',
        image: 'assets/images/themes/Wave.png'
    }, {
        name: 'Edge',
        category: 'Photography',
        url: 'https://github.com/TryGhost/Edge',
        previewUrl: 'https://edge.ghost.io',
        ref: 'TryGhost/Edge',
        image: 'assets/images/themes/Edge.png'
    }, {
        name: 'Dawn',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Dawn',
        previewUrl: 'https://dawn.ghost.io/',
        ref: 'TryGhost/Dawn',
        image: 'assets/images/themes/Dawn.png'
    }, {
        name: 'Ease',
        category: 'Documentation',
        url: 'https://github.com/TryGhost/Ease',
        previewUrl: 'https://ease.ghost.io',
        ref: 'TryGhost/Ease',
        image: 'assets/images/themes/Ease.png'
    }, {
        name: 'Ruby',
        category: 'Magazine',
        url: 'https://github.com/TryGhost/Ruby',
        previewUrl: 'https://ruby.ghost.io',
        ref: 'TryGhost/Ruby',
        image: 'assets/images/themes/Ruby.png'
    }, {
        name: 'London',
        category: 'Photography',
        url: 'https://github.com/TryGhost/London',
        previewUrl: 'https://london.ghost.io',
        ref: 'TryGhost/London',
        image: 'assets/images/themes/London.png'
    }, {
        name: 'Journal',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Journal',
        previewUrl: 'https://journal.ghost.io/',
        ref: 'TryGhost/Journal',
        image: 'assets/images/themes/Journal.png'
    }];

    return (
        <div className='p-[8vmin] pt-5'>
            <Heading>Themes</Heading>
            <div className='mt-6 grid grid-cols-3 gap-4'>
                {officialThemes.map((theme) => {
                    return (
                        <div key={theme.name} className='flex cursor-pointer flex-col gap-3' onClick={() => {
                            onSelectTheme?.(theme.name);
                        }}>
                            {/* <img alt={theme.name} src={theme.image}/> */}
                            <div className='h-[420px] w-full bg-grey-100'></div>
                            <span>{theme.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OfficialThemes;