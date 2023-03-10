import '../styles/index.css';
import React, {useState} from 'react';
import {ReactComponent as AddIcon} from '../assets/icons/kg-add.svg';
import {ReactComponent as AudioCardIcon} from '../assets/icons/kg-card-type-audio.svg';
import {ReactComponent as BoldIcon} from '../assets/icons/kg-bold.svg';
import {ReactComponent as BookmarkCardIcon} from '../assets/icons/kg-card-type-bookmark.svg';
import {ReactComponent as ButtonCardIcon} from '../assets/icons/kg-card-type-button.svg';
import {ReactComponent as CalloutCardIcon} from '../assets/icons/kg-card-type-callout.svg';
import {ReactComponent as CodepenCardIcon} from '../assets/icons/kg-card-type-codepen.svg';
import {ReactComponent as DividerCardIcon} from '../assets/icons/kg-card-type-divider.svg';
import {ReactComponent as EmailCardIcon} from '../assets/icons/kg-card-type-email.svg';
import {ReactComponent as EmailCtaCardIcon} from '../assets/icons/kg-card-type-email-cta.svg';
import {ReactComponent as FileCardIcon} from '../assets/icons/kg-card-type-file.svg';
import {ReactComponent as GalleryCardIcon} from '../assets/icons/kg-card-type-gallery.svg';
import {ReactComponent as GalleryPlaceholderIcon} from '../assets/icons/kg-gallery-placeholder.svg';
import {ReactComponent as GifCardIcon} from '../assets/icons/kg-card-type-gif.svg';
import {ReactComponent as HeaderCardIcon} from '../assets/icons/kg-card-type-header.svg';
import {ReactComponent as HeadingOneIcon} from '../assets/icons/kg-heading-1.svg';
import {ReactComponent as HeadingTwoIcon} from '../assets/icons/kg-heading-2.svg';
import {ReactComponent as HtmlCardIcon} from '../assets/icons/kg-card-type-html.svg';
import {ReactComponent as ImageCardIcon} from '../assets/icons/kg-card-type-image.svg';
import {ReactComponent as ImgFullIcon} from '../assets/icons/kg-img-full.svg';
import {ReactComponent as ImgPlaceholderIcon} from '../assets/icons/kg-img-placeholder.svg';
import {ReactComponent as ImgRegularIcon} from '../assets/icons/kg-img-regular.svg';
import {ReactComponent as ImgWideIcon} from '../assets/icons/kg-img-wide.svg';
import {ReactComponent as ItalicIcon} from '../assets/icons/kg-italic.svg';
import {ReactComponent as LinkIcon} from '../assets/icons/kg-link.svg';
import {ReactComponent as MarkdownCardIcon} from '../assets/icons/kg-card-type-markdown.svg';
import {ReactComponent as NftCardIcon} from '../assets/icons/kg-card-type-nft.svg';
import {ReactComponent as OtherCardIcon} from '../assets/icons/kg-card-type-other.svg';
import {ReactComponent as PlusIcon} from '../assets/icons/plus.svg';
import {ReactComponent as PreviewCardIcon} from '../assets/icons/kg-card-type-preview.svg';
import {ReactComponent as ProductCardIcon} from '../assets/icons/kg-card-type-product.svg';
import {ReactComponent as QuoteIcon} from '../assets/icons/kg-quote.svg';
import {ReactComponent as ReplaceIcon} from '../assets/icons/kg-replace.svg';
import {ReactComponent as SnippetCardIcon} from '../assets/icons/kg-card-type-snippet.svg';
import {ReactComponent as SnippetIcon} from '../assets/icons/kg-snippet.svg';
import {ReactComponent as SoundcloudCardIcon} from '../assets/icons/kg-card-type-soundcloud.svg';
import {ReactComponent as SpotifyCardIcon} from '../assets/icons/kg-card-type-spotify.svg';
import {ReactComponent as ToggleCardIcon} from '../assets/icons/kg-card-type-toggle.svg';
import {ReactComponent as TwitterCardIcon} from '../assets/icons/kg-card-type-twitter.svg';
import {ReactComponent as UnsplashCardIcon} from '../assets/icons/kg-card-type-unsplash.svg';
import {ReactComponent as VideoCardIcon} from '../assets/icons/kg-card-type-video.svg';
import {ReactComponent as VimeoCardIcon} from '../assets/icons/kg-card-type-vimeo.svg';
import {ReactComponent as YoutubeCardIcon} from '../assets/icons/kg-card-type-youtube.svg';

const DesignSandbox = () => {
    return (
        <div className="koenig-lexical">
            <ComponentTitle label="Text toolbar" />
            <TextToolbar />

            <ComponentTitle label="Image toolbar" />
            <ImageToolbar />

            <ComponentTitle label="Gallery toolbar" />
            <GalleryToolbar />

            <ComponentTitle label="Plus menu" />
            <PlusButton />

            <ComponentTitle label="Card menu" />
            <CardMenu />

            <ComponentTitle label="Divider card" />
            <div className="relative max-w-[740px]">
                <DividerCard />
            </div>

            <ComponentTitle label="Code block" />
            <div className="relative max-w-[740px]">
                <CodeBlock />
            </div>

            <ComponentTitle label="Image card" />
            <div className="relative max-w-[740px]">
                <ImageCard />
            </div>

            <ComponentTitle label="Gallery card" />
            <div className="relative max-w-[1172px]">
                <GalleryCard />
            </div>
        </div>
    );

    /* Component title
    /* ---------------------------------------------------------- */

    function ComponentTitle({label}) {
        return (
            <h3 className="mb-4 mt-20 text-xl font-bold first-of-type:mt-8" >
                {label}
            </h3>
        );
    }

    /* Floating toolbar
    /* ---------------------------------------------------------- */

    function TextToolbar() {
        return (
            <div className="max-w-fit">
                <ul className="m-0 flex items-center justify-evenly rounded bg-black px-1 py-0 font-sans text-md font-normal text-white">
                    <ToolbarItem label="Format text as bold" Icon={BoldIcon} />
                    <ToolbarItem label="Format text as italics" Icon={ItalicIcon} />
                    <ToolbarItem label="Toggle heading 1" Icon={HeadingOneIcon} />
                    <ToolbarItem label="Toggle heading 2" Icon={HeadingTwoIcon} />
                    <ToolbarSeparator />
                    <ToolbarItem label="Toggle blockquote" Icon={QuoteIcon} />
                    <ToolbarItem label="Insert link" Icon={LinkIcon} />
                    <ToolbarSeparator />
                    <ToolbarItem label="Save as snippet" Icon={SnippetIcon} />
                </ul>
            </div>  
        );
    }

    function ImageToolbar() {
        return (
            <div className="max-w-fit">
                <ul className="m-0 flex items-center justify-evenly rounded bg-black px-1 py-0 font-sans text-md font-normal text-white">
                    <ToolbarItem label="Set image to regular" Icon={ImgRegularIcon} />
                    <ToolbarItem label="Set image to wide" Icon={ImgWideIcon} />
                    <ToolbarItem label="Set image to full" Icon={ImgFullIcon} />
                    <ToolbarSeparator />
                    <ToolbarItem label="Insert link" Icon={LinkIcon} />
                    <ToolbarItem label="Replace image" Icon={ReplaceIcon} />
                    <ToolbarSeparator />
                    <ToolbarItem label="Save as snippet" Icon={SnippetIcon} />
                </ul>
            </div>  
        );
    }

    function GalleryToolbar() {
        return (
            <div className="max-w-fit">
                <ul className="m-0 flex items-center justify-evenly rounded bg-black px-1 py-0 font-sans text-md font-normal text-white">
                    <ToolbarItem label="Add image" Icon={AddIcon} />
                    <ToolbarSeparator />
                    <ToolbarItem label="Save as snippet" Icon={SnippetIcon} />
                </ul>
            </div>  
        );
    }

    function ToolbarItem({label, Icon, ...props}) {
        return (
            <li className="m-0 flex p-0 first:m-0" {...props}>
                <div
                    type="button"
                    className="flex h-9 w-9 items-center justify-center"
                >
                    <Icon className="fill-white" />
                </div>
            </li>
        );
    }
    
    function ToolbarSeparator() {
        return (
            <li className="m-0 mx-1 h-5 w-px bg-grey-900"></li>
        );
    }

    /* Plus button
    /* ---------------------------------------------------------- */

    function PlusButton() {
        return (
            <button
                type="button"
                aria-label="Add a card"
                className="group relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-grey bg-white transition-all ease-linear hover:border-grey-900 md:h-9 md:w-9"
            >
                <PlusIcon className="h-4 w-4 stroke-grey-800 stroke-2 group-hover:stroke-grey-900" />
            </button>
        );
    }

    /* Card menu
    /* ---------------------------------------------------------- */

    function CardMenu() {
        return (
            <div className="z-[9999999] m-0 mb-3 max-h-[376px] w-[312px] flex-col overflow-y-auto rounded-lg bg-white bg-clip-padding p-0 text-sm shadow">
                <CardMenuSection label="Primary" />
                <CardMenuItem label="Image" desc="Upload, or embed with /image [url]" Icon={ImageCardIcon} />
                <CardMenuItem label="Markdown" desc="Insert a Markdown editor card" Icon={MarkdownCardIcon} />
                <CardMenuItem label="HTML" desc="Insert a raw HTML card" Icon={HtmlCardIcon} />
                <CardMenuItem label="Gallery" desc="Create an image gallery" Icon={GalleryCardIcon} />
                <CardMenuItem label="Divider" desc="Insert a dividing line" Icon={DividerCardIcon} />
                <CardMenuItem label="Bookmark" desc="Embed a link as a visual bookmark" Icon={BookmarkCardIcon} />
                <CardMenuItem label="Email content" desc="Only visible when delivered by email" Icon={EmailCardIcon} />
                <CardMenuItem label="Email call to action" desc="Target free or paid members with a CTA" Icon={EmailCtaCardIcon} />
                <CardMenuItem label="Public preview" desc="Attract signups with a public intro" Icon={PreviewCardIcon} />
                <CardMenuItem label="Button" desc="Add a button to your post" Icon={ButtonCardIcon} />
                <CardMenuItem label="Callout" desc="Info boxes that stand out" Icon={CalloutCardIcon} />
                <CardMenuItem label="GIF" desc="Search and embed gifs" Icon={GifCardIcon} />
                <CardMenuItem label="Toggle" desc="Add collapsible content" Icon={ToggleCardIcon} />
                <CardMenuItem label="Video" desc="Upload and play a video" Icon={VideoCardIcon} />
                <CardMenuItem label="Audio" desc="Upload and play an audio file" Icon={AudioCardIcon} />
                <CardMenuItem label="File" desc="Upload a downloadable file" Icon={FileCardIcon} />
                <CardMenuItem label="Product" desc="Add a product recommendation" Icon={ProductCardIcon} />
                <CardMenuItem label="Header" desc="Add a bold section header" Icon={HeaderCardIcon} />
                <CardMenuSection label="Embed" />
                <CardMenuItem label="YouTube" desc="/youtube [video url]" Icon={YoutubeCardIcon} />
                <CardMenuItem label="Twitter" desc="/twitter [tweet url]" Icon={TwitterCardIcon} />
                <CardMenuItem label="Unsplash" desc="/unsplash [search-term or url]" Icon={UnsplashCardIcon} />
                <CardMenuItem label="Vimeo" desc="/vimeo [video url]" Icon={VimeoCardIcon} />
                <CardMenuItem label="CodePen" desc="/codepen [pen url]" Icon={CodepenCardIcon} />
                <CardMenuItem label="Spotify" desc="/spotify [track or playlist url]" Icon={SpotifyCardIcon} />
                <CardMenuItem label="SoundCloud" desc="/soundcloud [track or playlist url]" Icon={SoundcloudCardIcon} />
                <CardMenuItem label="NFT" desc="/nft [opensea url]" Icon={NftCardIcon} />
                <CardMenuItem label="Other..." desc="/embed [url]" Icon={OtherCardIcon} />
                <CardMenuSection label="Snippets" />
                <CardSnippetItem label="A random snippet" Icon={SnippetCardIcon} />
            </div>
        );
    }

    function CardMenuSection({label, ...props}) {
        return (
            <div className="mb-2 flex shrink-0 flex-col justify-center px-4 pt-3 text-xs font-medium uppercase tracking-[.06rem] text-grey" style={{minWidth: 'calc(100% - 3.2rem)'}} {...props}>
                {label}
            </div>
        );
    }

    function CardMenuItem({label, desc, Icon, ...props}) {
        return (
            <div className="flex cursor-pointer flex-row items-center border border-transparent px-4 py-2 text-grey-800 hover:bg-grey-100" {...props}>
                <div className="flex items-center">
                    <Icon className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                    <div className="m-0 ml-4 truncate text-[1.3rem] font-normal leading-[1.333em] tracking-[.02rem] text-grey-900">{label}</div>
                    <div className="m-0 ml-4 truncate text-xs font-normal leading-[1.333em] tracking-[.02rem] text-grey">{desc}</div>
                </div>
            </div>
        );
    }

    function CardSnippetItem({label, Icon, ...props}) {
        return (
            <div className="flex cursor-pointer flex-row items-center border border-transparent px-4 py-2 text-grey-800 hover:bg-grey-100" {...props}>
                <div className="flex items-center">
                    <Icon className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                    <div className="m-0 ml-4 truncate text-[1.3rem] font-normal leading-[1.333em] tracking-[.02rem] text-grey-900">{label}</div>
                </div>
            </div>
        );
    }

    /* Divider card
    /* ---------------------------------------------------------- */

    function DividerCard() {
        return (
            <div>
                <hr className="block h-[1px] border-0 border-t border-grey-300" />
            </div>
        );
    }

    /* Code block
    /* ---------------------------------------------------------- */

    function CodeBlock() {
        return (
            <div className="border-2 border-green">
                <div className="rounded bg-grey-50 px-3 py-2">
                    <textarea className="w-full resize-none bg-grey-50 font-mono text-[1.7rem]" />
                </div>
                <CaptionEditor placeholder="Type caption for code block (optional)" />
            </div>
        );
    }

    /* Image card
    /* ---------------------------------------------------------- */

    function ImageCard() {
        const [isActive, setActive] = useState(false);
        const [altText, setAltText] = useState(false);

        const toggleActive = () => {
            setActive(!isActive);
        };

        const toggleAltText = (e) => {
            e.stopPropagation();
            setAltText(!altText);
        };

        if (isActive) {
            return (
                <div 
                    className={`border border-transparent ${isActive ? 'shadow-[0_0_0_2px_#30cf43]' : 'hover:shadow-[0_0_0_1px_#30cf43]'}`}
                    onClick={toggleActive}>
                    <MediaPlaceholder desc="Click to select an image" Icon={ImgPlaceholderIcon} />
                    <CaptionEditor placeholder="Type caption for image (optional)" />
                    <button 
                        className={`absolute bottom-0 right-0 m-3 cursor-pointer rounded border px-1 text-[1.3rem] font-normal leading-7 tracking-wide transition-all duration-100 ${altText ? 'border-green bg-green text-white' : 'border-grey text-grey' } `}
                        onClick={e => toggleAltText(e)}>
                            Alt
                    </button>           
                </div>
            );
        } 
        return (
            <div 
                className={`border border-transparent ${isActive ? 'shadow-[0_0_0_2px_#30cf43]' : 'hover:shadow-[0_0_0_1px_#30cf43]'}`}
                onClick={toggleActive}>
                <MediaPlaceholder desc="Click to select an image" Icon={ImgPlaceholderIcon} />        
            </div>
        );
    }

    function MediaPlaceholder({desc, Icon, ...props}) {
        return (
            <div className="relative">
                <figure className="cursor-pointer border border-transparent" {...props}>
                    <div className="h-100 relative flex items-center justify-center border border-grey-100 bg-grey-50 before:pb-[62.5%]">
                        <button className="group flex flex-col items-center justify-center p-20">
                            <Icon className="h-32 w-32 opacity-80 transition-all ease-linear group-hover:scale-105 group-hover:opacity-100" />
                            <p className="mt-4 text-sm font-normal text-grey-700 group-hover:text-grey-800">{desc}</p>
                        </button>
                    </div>
                </figure>
                <form>
                    <input
                        type='file'
                        accept='image/*'
                        name="image"
                        hidden={true}
                    />
                </form>
            </div>
        );
    }

    function CaptionEditor({placeholder}) {
        return (
            <input 
                className="not-kg-prose w-full p-2 text-center font-sans text-sm font-normal tracking-wide text-grey-900"
                placeholder={placeholder} 
            />
        );
    }

    /* Gallery card
    /* ---------------------------------------------------------- */

    function GalleryCard() {
        return (
            <div className="border-2 border-green">
                <MediaPlaceholder desc="Click to select up to 9 images" Icon={GalleryPlaceholderIcon} />
                <CaptionEditor placeholder="Type caption for gallery (optional)" />
            </div>
        );
    }
};

export default DesignSandbox;
