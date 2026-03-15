import {type OfficialTheme} from '../components/providers/settings-app-provider';

// Theme images
import AltoImage from '../assets/images/themes/Alto.png';
import BulletinImage from '../assets/images/themes/Bulletin.png';
import CasperImage from '../assets/images/themes/Casper.png';
import DawnImage from '../assets/images/themes/Dawn.png';
import DigestImage from '../assets/images/themes/Digest.png';
import DopeImage from '../assets/images/themes/Dope.png';
import EaseImage from '../assets/images/themes/Ease.png';
import EdgeImage from '../assets/images/themes/Edge.png';
import EditionImage from '../assets/images/themes/Edition.png';
import EpisodeImage from '../assets/images/themes/Episode.png';
import HeadlineImage from '../assets/images/themes/Headline.png';
import JournalImage from '../assets/images/themes/Journal.png';
import LondonImage from '../assets/images/themes/London.png';
import RubyImage from '../assets/images/themes/Ruby.png';
import SoloImage from '../assets/images/themes/Solo.png';
import SourceImage from '../assets/images/themes/Source.png';
import SourceMagazineImage from '../assets/images/themes/Source-Magazine.png';
import SourceNewsletterImage from '../assets/images/themes/Source-Newsletter.png';
import TasteImage from '../assets/images/themes/Taste.png';
import WaveImage from '../assets/images/themes/Wave.png';

export const officialThemes: OfficialTheme[] = [{
    name: 'Source',
    category: 'News',
    previewUrl: 'https://source.ghost.io/',
    ref: 'default',
    image: SourceImage,
    variants: [
        {
            category: 'Magazine',
            previewUrl: 'https://source-magazine.ghost.io/',
            image: SourceMagazineImage
        },
        {
            category: 'Newsletter',
            previewUrl: 'https://source-newsletter.ghost.io/',
            image: SourceNewsletterImage
        }
    ]
}, {
    name: 'Casper',
    category: 'Blog',
    previewUrl: 'https://demo.ghost.io/',
    ref: 'TryGhost/Casper',
    image: CasperImage
}, {
    name: 'Edition',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Edition',
    previewUrl: 'https://edition.ghost.io/',
    ref: 'TryGhost/Edition',
    image: EditionImage
}, {
    name: 'Solo',
    category: 'Blog',
    url: 'https://github.com/TryGhost/Solo',
    previewUrl: 'https://solo.ghost.io',
    ref: 'TryGhost/Solo',
    image: SoloImage
}, {
    name: 'Taste',
    category: 'Blog',
    url: 'https://github.com/TryGhost/Taste',
    previewUrl: 'https://taste.ghost.io',
    ref: 'TryGhost/Taste',
    image: TasteImage
}, {
    name: 'Episode',
    category: 'Podcast',
    url: 'https://github.com/TryGhost/Episode',
    previewUrl: 'https://episode.ghost.io',
    ref: 'TryGhost/Episode',
    image: EpisodeImage
}, {
    name: 'Digest',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Digest',
    previewUrl: 'https://digest.ghost.io/',
    ref: 'TryGhost/Digest',
    image: DigestImage
}, {
    name: 'Bulletin',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Bulletin',
    previewUrl: 'https://bulletin.ghost.io/',
    ref: 'TryGhost/Bulletin',
    image: BulletinImage
}, {
    name: 'Alto',
    category: 'Blog',
    url: 'https://github.com/TryGhost/Alto',
    previewUrl: 'https://alto.ghost.io',
    ref: 'TryGhost/Alto',
    image: AltoImage
}, {
    name: 'Dope',
    category: 'Magazine',
    url: 'https://github.com/TryGhost/Dope',
    previewUrl: 'https://dope.ghost.io',
    ref: 'TryGhost/Dope',
    image: DopeImage
}, {
    name: 'Wave',
    category: 'Podcast',
    url: 'https://github.com/TryGhost/Wave',
    previewUrl: 'https://wave.ghost.io',
    ref: 'TryGhost/Wave',
    image: WaveImage
}, {
    name: 'Edge',
    category: 'Photography',
    url: 'https://github.com/TryGhost/Edge',
    previewUrl: 'https://edge.ghost.io',
    ref: 'TryGhost/Edge',
    image: EdgeImage
}, {
    name: 'Dawn',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Dawn',
    previewUrl: 'https://dawn.ghost.io/',
    ref: 'TryGhost/Dawn',
    image: DawnImage
}, {
    name: 'Ease',
    category: 'Documentation',
    url: 'https://github.com/TryGhost/Ease',
    previewUrl: 'https://ease.ghost.io',
    ref: 'TryGhost/Ease',
    image: EaseImage
}, {
    name: 'Headline',
    category: 'News',
    url: 'https://github.com/TryGhost/Headline',
    previewUrl: 'https://headline.ghost.io',
    ref: 'TryGhost/Headline',
    image: HeadlineImage
}, {
    name: 'Ruby',
    category: 'Magazine',
    url: 'https://github.com/TryGhost/Ruby',
    previewUrl: 'https://ruby.ghost.io',
    ref: 'TryGhost/Ruby',
    image: RubyImage
}, {
    name: 'London',
    category: 'Photography',
    url: 'https://github.com/TryGhost/London',
    previewUrl: 'https://london.ghost.io',
    ref: 'TryGhost/London',
    image: LondonImage
}, {
    name: 'Journal',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Journal',
    previewUrl: 'https://journal.ghost.io/',
    ref: 'TryGhost/Journal',
    image: JournalImage
}];
