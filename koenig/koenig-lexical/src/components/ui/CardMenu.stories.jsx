import React from 'react';

import {
    CardMenu,
    CardMenuItem,
    CardMenuSection,
    CardSnippetItem
} from './CardMenu';

import AudioCardIcon from '../../assets/icons/kg-card-type-audio.svg?react';
import BookmarkCardIcon from '../../assets/icons/kg-card-type-bookmark.svg?react';
import ButtonCardIcon from '../../assets/icons/kg-card-type-button.svg?react';
import CalloutCardIcon from '../../assets/icons/kg-card-type-callout.svg?react';
import CodePenCardIcon from '../../assets/icons/kg-card-type-codepen.svg?react';
import DividerCardIcon from '../../assets/icons/kg-card-type-divider.svg?react';
import EmailCardIcon from '../../assets/icons/kg-card-type-email.svg?react';
import EmailCtaCardIcon from '../../assets/icons/kg-card-type-email-cta.svg?react';
import FileCardIcon from '../../assets/icons/kg-card-type-file.svg?react';
import GalleryCardIcon from '../../assets/icons/kg-card-type-gallery.svg?react';
import GifCardIcon from '../../assets/icons/kg-card-type-gif.svg?react';
import HeaderCardIcon from '../../assets/icons/kg-card-type-header.svg?react';
import HtmlCardIcon from '../../assets/icons/kg-card-type-html.svg?react';
import ImageCardIcon from '../../assets/icons/kg-card-type-image.svg?react';
import MarkdownCardIcon from '../../assets/icons/kg-card-type-markdown.svg?react';
import NftCardIcon from '../../assets/icons/kg-card-type-nft.svg?react';
import OtherCardIcon from '../../assets/icons/kg-card-type-other.svg?react';
import PreviewCardIcon from '../../assets/icons/kg-card-type-preview.svg?react';
import ProductCardIcon from '../../assets/icons/kg-card-type-product.svg?react';
import SignupCardIcon from '../../assets/icons/kg-card-type-signup.svg?react';
import SnippetCardIcon from '../../assets/icons/kg-card-type-snippet.svg?react';
import SoundCloudCardIcon from '../../assets/icons/kg-card-type-soundcloud.svg?react';
import SpotifyCardIcon from '../../assets/icons/kg-card-type-spotify.svg?react';
import ToggleCardIcon from '../../assets/icons/kg-card-type-toggle.svg?react';
import TwitterCardIcon from '../../assets/icons/kg-card-type-twitter.svg?react';
import UnsplashCardIcon from '../../assets/icons/kg-card-type-unsplash.svg?react';
import VideoCardIcon from '../../assets/icons/kg-card-type-video.svg?react';
import VimeoCardIcon from '../../assets/icons/kg-card-type-vimeo.svg?react';
import YoutubeCardIcon from '../../assets/icons/kg-card-type-youtube.svg?react';

const story = {
    title: 'Card menu/Card menu',
    component: CardMenu,
    subcomponent: {CardMenuSection, CardMenuItem, CardSnippetItem},
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template = args => <CardMenu {...args} />;

export const Default = Template.bind({});
Default.args = {
    menu: new Map([
        ['Primary', [
            {label: 'Image', desc: 'Upload, or embed with /image [url]', Icon: ImageCardIcon},
            {label: 'Markdown', desc: 'Insert a Markdown editor card', Icon: MarkdownCardIcon},
            {label: 'HTML', desc: 'Insert a raw HTML card', Icon: HtmlCardIcon},
            {label: 'Gallery', desc: 'Create an image gallery', Icon: GalleryCardIcon},
            {label: 'Divider', desc: 'Insert a dividing line', Icon: DividerCardIcon},
            {label: 'Bookmark', desc: 'Embed a link as a visual bookmark', Icon: BookmarkCardIcon},
            {label: 'Email content', desc: 'Only visible when delivered by email', Icon: EmailCardIcon},
            {label: 'Email CTA', desc: 'Target free or paid members with a CTA', Icon: EmailCtaCardIcon},
            {label: 'Public Preview', desc: 'Attract signups with a public intro', Icon: PreviewCardIcon},
            {label: 'Button', desc: 'Add a button to your post', Icon: ButtonCardIcon},
            {label: 'Callout', desc: 'Info boxes that stand out', Icon: CalloutCardIcon},
            {label: 'GIF', desc: 'Search and embed gifs', Icon: GifCardIcon},
            {label: 'Toggle', desc: 'Add collapsible content', Icon: ToggleCardIcon},
            {label: 'Video', desc: 'Upload and play a video', Icon: VideoCardIcon},
            {label: 'Audio', desc: 'Upload and play an audio file', Icon: AudioCardIcon},
            {label: 'File', desc: 'Upload a downloadable file', Icon: FileCardIcon},
            {label: 'Product', desc: 'Add a product recommendation', Icon: ProductCardIcon},
            {label: 'Header', desc: 'Add a bold section header', Icon: HeaderCardIcon},
            {label: 'Signup', desc: 'Convert visitors into members', Icon: SignupCardIcon}
        ]],
        ['Embed', [
            {label: 'YouTube', desc: '/youtube [video url]', Icon: YoutubeCardIcon},
            {label: 'Twitter', desc: '/twitter [tweet url]', Icon: TwitterCardIcon},
            {label: 'Unsplash', desc: '/unsplash [search-term or url]', Icon: UnsplashCardIcon},
            {label: 'Vimeo', desc: '/vimeo [video url]', Icon: VimeoCardIcon},
            {label: 'CodePen', desc: '/codepen [pen url]', Icon: CodePenCardIcon},
            {label: 'Spotify', desc: '/spotify [track or playlist url]', Icon: SpotifyCardIcon},
            {label: 'SoundCloud', desc: '/soundcloud [track or playlist url]', Icon: SoundCloudCardIcon},
            {label: 'NFT', desc: '/nft [opensea url]', Icon: NftCardIcon},
            {label: 'Other...', desc: '/embed [url]', Icon: OtherCardIcon}
        ]],
        ['Snippets', [
            {type: 'snippet', label: 'Snippet one', Icon: SnippetCardIcon},
            {type: 'snippet', label: 'Snippet two', Icon: SnippetCardIcon}
        ]]
    ])
};
