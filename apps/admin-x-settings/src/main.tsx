import './styles/index.css';
import App from './App.tsx';
import renderStandaloneApp from '@tryghost/admin-x-framework/test/render';

renderStandaloneApp(App, {
    officialThemes: [{
        name: 'Source',
        category: 'News',
        previewUrl: 'https://source.ghost.io/',
        ref: 'default',
        image: 'assets/img/themes/Source.png',
        variants: [
            {
                category: 'Magazine',
                previewUrl: 'https://source-magazine.ghost.io/',
                image: 'assets/img/themes/Source-Magazine.png'
            },
            {
                category: 'Newsletter',
                previewUrl: 'https://source-newsletter.ghost.io/',
                image: 'assets/img/themes/Source-Newsletter.png'
            }
        ]
    }, {
        name: 'Casper',
        category: 'Blog',
        previewUrl: 'https://demo.ghost.io/',
        ref: 'default',
        image: 'assets/img/themes/Casper.png'
    }, {
        name: 'Headline',
        category: 'News',
        url: 'https://github.com/TryGhost/Headline',
        previewUrl: 'https://headline.ghost.io',
        ref: 'TryGhost/Headline',
        image: 'assets/img/themes/Headline.png'
    }, {
        name: 'Edition',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Edition',
        previewUrl: 'https://edition.ghost.io/',
        ref: 'TryGhost/Edition',
        image: 'assets/img/themes/Edition.png'
    }],
    zapierTemplates: []
});
