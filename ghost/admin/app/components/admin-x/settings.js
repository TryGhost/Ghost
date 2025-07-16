import AdminXComponent from './admin-x-component';
import {inject as service} from '@ember/service';

// TODO: Long term move asset management directly in AdminX
const officialThemes = [{
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
    ref: 'TryGhost/Casper',
    image: 'assets/img/themes/Casper.png'
}, {
    name: 'Edition',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Edition',
    previewUrl: 'https://edition.ghost.io/',
    ref: 'TryGhost/Edition',
    image: 'assets/img/themes/Edition.png'
}, {
    name: 'Solo',
    category: 'Blog',
    url: 'https://github.com/TryGhost/Solo',
    previewUrl: 'https://solo.ghost.io',
    ref: 'TryGhost/Solo',
    image: 'assets/img/themes/Solo.png'
}, {
    name: 'Taste',
    category: 'Blog',
    url: 'https://github.com/TryGhost/Taste',
    previewUrl: 'https://taste.ghost.io',
    ref: 'TryGhost/Taste',
    image: 'assets/img/themes/Taste.png'
}, {
    name: 'Episode',
    category: 'Podcast',
    url: 'https://github.com/TryGhost/Episode',
    previewUrl: 'https://episode.ghost.io',
    ref: 'TryGhost/Episode',
    image: 'assets/img/themes/Episode.png'
}, {
    name: 'Digest',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Digest',
    previewUrl: 'https://digest.ghost.io/',
    ref: 'TryGhost/Digest',
    image: 'assets/img/themes/Digest.png'
}, {
    name: 'Bulletin',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Bulletin',
    previewUrl: 'https://bulletin.ghost.io/',
    ref: 'TryGhost/Bulletin',
    image: 'assets/img/themes/Bulletin.png'
}, {
    name: 'Alto',
    category: 'Blog',
    url: 'https://github.com/TryGhost/Alto',
    previewUrl: 'https://alto.ghost.io',
    ref: 'TryGhost/Alto',
    image: 'assets/img/themes/Alto.png'
}, {
    name: 'Dope',
    category: 'Magazine',
    url: 'https://github.com/TryGhost/Dope',
    previewUrl: 'https://dope.ghost.io',
    ref: 'TryGhost/Dope',
    image: 'assets/img/themes/Dope.png'
}, {
    name: 'Wave',
    category: 'Podcast',
    url: 'https://github.com/TryGhost/Wave',
    previewUrl: 'https://wave.ghost.io',
    ref: 'TryGhost/Wave',
    image: 'assets/img/themes/Wave.png'
}, {
    name: 'Edge',
    category: 'Photography',
    url: 'https://github.com/TryGhost/Edge',
    previewUrl: 'https://edge.ghost.io',
    ref: 'TryGhost/Edge',
    image: 'assets/img/themes/Edge.png'
}, {
    name: 'Dawn',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Dawn',
    previewUrl: 'https://dawn.ghost.io/',
    ref: 'TryGhost/Dawn',
    image: 'assets/img/themes/Dawn.png'
}, {
    name: 'Ease',
    category: 'Documentation',
    url: 'https://github.com/TryGhost/Ease',
    previewUrl: 'https://ease.ghost.io',
    ref: 'TryGhost/Ease',
    image: 'assets/img/themes/Ease.png'
}, {
    name: 'Headline',
    category: 'News',
    url: 'https://github.com/TryGhost/Headline',
    previewUrl: 'https://headline.ghost.io',
    ref: 'TryGhost/Headline',
    image: 'assets/img/themes/Headline.png'
}, {
    name: 'Ruby',
    category: 'Magazine',
    url: 'https://github.com/TryGhost/Ruby',
    previewUrl: 'https://ruby.ghost.io',
    ref: 'TryGhost/Ruby',
    image: 'assets/img/themes/Ruby.png'
}, {
    name: 'London',
    category: 'Photography',
    url: 'https://github.com/TryGhost/London',
    previewUrl: 'https://london.ghost.io',
    ref: 'TryGhost/London',
    image: 'assets/img/themes/London.png'
}, {
    name: 'Journal',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Journal',
    previewUrl: 'https://journal.ghost.io/',
    ref: 'TryGhost/Journal',
    image: 'assets/img/themes/Journal.png'
}];

const zapierTemplates = [{
    ghostImage: 'assets/img/logos/orb-black-2.png',
    appImage: 'assets/img/slackicon.png',
    title: 'Share scheduled posts with your team in Slack',
    url: 'https://zapier.com/webintent/create-zap?template=359499'
}, {
    ghostImage: 'assets/img/logos/orb-black-3.png',
    appImage: 'assets/img/patreon.svg',
    title: 'Connect Patreon to your Ghost membership site',
    url: 'https://zapier.com/webintent/create-zap?template=75801'
}, {
    ghostImage: 'assets/img/logos/orb-black-4.png',
    appImage: 'assets/img/zero-bounce.png',
    title: 'Protect email delivery with email verification',
    url: 'https://zapier.com/webintent/create-zap?template=359415'
}, {
    ghostImage: 'assets/img/logos/orb-black-5.png',
    appImage: 'assets/img/paypal.svg',
    title: 'Add members for successful sales in PayPal',
    url: 'https://zapier.com/webintent/create-zap?template=184423'
}, {
    ghostImage: 'assets/img/logos/orb-black-3.png',
    appImage: 'assets/img/paypal.svg',
    title: 'Unsubscribe members who cancel a subscription in PayPal',
    url: 'https://zapier.com/webintent/create-zap?template=359348'
}, {
    ghostImage: 'assets/img/logos/orb-black-1.png',
    appImage: 'assets/img/google-docs.svg',
    title: 'Send new post drafts from Google Docs to Ghost',
    url: 'https://zapier.com/webintent/create-zap?template=50924'
}, {
    ghostImage: 'assets/img/logos/orb-black-4.png',
    appImage: 'assets/img/typeform.svg',
    title: 'Survey new members using Typeform',
    url: 'https://zapier.com/webintent/create-zap?template=359407'
}, {
    ghostImage: 'assets/img/logos/orb-black-1.png',
    appImage: 'assets/img/mailchimp.svg',
    title: 'Sync email subscribers in Ghost + Mailchimp',
    url: 'https://zapier.com/webintent/create-zap?template=359342'
}];

export default class AdminXSettings extends AdminXComponent {
    @service upgradeStatus;

    static packageName = '@tryghost/admin-x-settings';

    additionalProps = () => ({
        officialThemes,
        zapierTemplates,
        upgradeStatus: this.upgradeStatus
    });
}
