import type {Card} from '../types.js';
import bookmarkCard from './bookmark.js';
import codeCard from './code.js';
import emailCard from './email.js';
import emailCtaCard from './email-cta.js';
import embedCard from './embed.js';
import galleryCard from './gallery.js';
import hrCard from './hr.js';
import htmlCard from './html.js';
import imageCard from './image.js';
import markdownCard from './markdown.js';
import paywallCard from './paywall.js';
import buttonCard from './button.js';
import calloutCard from './callout.js';
import productCard from './product.js';
import toggleCard from './toggle.js';
import audioCard from './audio.js';
import videoCard from './video.js';
import fileCard from './file.js';
import headerCard from './header.js';
import beforeAfterCard from './before-after.js';

const cards: Card[] = [
    bookmarkCard,
    codeCard,
    emailCard,
    emailCtaCard,
    embedCard,
    galleryCard,
    hrCard,
    htmlCard,
    imageCard,
    markdownCard,
    paywallCard,
    buttonCard,
    calloutCard,
    productCard,
    toggleCard,
    audioCard,
    videoCard,
    fileCard,
    headerCard,
    beforeAfterCard
];

export {cards};
