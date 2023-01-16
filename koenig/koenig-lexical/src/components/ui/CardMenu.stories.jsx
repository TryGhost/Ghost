import React from 'react';

import {
    CardMenu,
    CardMenuSection,
    CardMenuItem,
    CardSnippetItem
} from './CardMenu';

import {ReactComponent as ImageCardIcon} from '../../assets/icons/kg-card-type-image.svg';
import {ReactComponent as MarkdownCardIcon} from '../../assets/icons/kg-card-type-markdown.svg';
import {ReactComponent as HtmlCardIcon} from '../../assets/icons/kg-card-type-html.svg';
import {ReactComponent as GalleryCardIcon} from '../../assets/icons/kg-card-type-gallery.svg';
import {ReactComponent as DividerCardIcon} from '../../assets/icons/kg-card-type-divider.svg';
import {ReactComponent as BookmarkCardIcon} from '../../assets/icons/kg-card-type-bookmark.svg';
import {ReactComponent as EmailCardIcon} from '../../assets/icons/kg-card-type-email.svg';
import {ReactComponent as EmailCtaCardIcon} from '../../assets/icons/kg-card-type-email-cta.svg';
import {ReactComponent as PreviewCardIcon} from '../../assets/icons/kg-card-type-preview.svg';
import {ReactComponent as ButtonCardIcon} from '../../assets/icons/kg-card-type-button.svg';
import {ReactComponent as CalloutCardIcon} from '../../assets/icons/kg-card-type-callout.svg';
import {ReactComponent as GifCardIcon} from '../../assets/icons/kg-card-type-gif.svg';
import {ReactComponent as ToggleCardIcon} from '../../assets/icons/kg-card-type-toggle.svg';
import {ReactComponent as VideoCardIcon} from '../../assets/icons/kg-card-type-video.svg';
import {ReactComponent as AudioCardIcon} from '../../assets/icons/kg-card-type-audio.svg';
import {ReactComponent as FileCardIcon} from '../../assets/icons/kg-card-type-file.svg';
import {ReactComponent as ProductCardIcon} from '../../assets/icons/kg-card-type-product.svg';
import {ReactComponent as HeaderCardIcon} from '../../assets/icons/kg-card-type-header.svg';
import {ReactComponent as YoutubeCardIcon} from '../../assets/icons/kg-card-type-youtube.svg';
import {ReactComponent as TwitterCardIcon} from '../../assets/icons/kg-card-type-twitter.svg';
import {ReactComponent as UnsplashCardIcon} from '../../assets/icons/kg-card-type-unsplash.svg';
import {ReactComponent as VimeoCardIcon} from '../../assets/icons/kg-card-type-vimeo.svg';
import {ReactComponent as CodePenCardIcon} from '../../assets/icons/kg-card-type-codepen.svg';
import {ReactComponent as SpotifyCardIcon} from '../../assets/icons/kg-card-type-spotify.svg';
import {ReactComponent as SoundCloudCardIcon} from '../../assets/icons/kg-card-type-soundcloud.svg';
import {ReactComponent as NftCardIcon} from '../../assets/icons/kg-card-type-nft.svg';
import {ReactComponent as OtherCardIcon} from '../../assets/icons/kg-card-type-other.svg';
import {ReactComponent as SnippetCardIcon} from '../../assets/icons/kg-card-type-snippet.svg';

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
            {label: 'Header', desc: 'Add a bold section header', Icon: HeaderCardIcon}
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
