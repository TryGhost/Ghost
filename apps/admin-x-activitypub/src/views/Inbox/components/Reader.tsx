import Customizer, {COLOR_OPTIONS, type ColorOption, type FontSize, useCustomizerSettings} from './Customizer';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import getUsername from '../../../utils/get-username';
import {Skeleton} from '@tryghost/shade';

import {LoadingIndicator} from '@tryghost/admin-x-design-system';
import {renderTimestamp} from '../../../utils/render-timestamp';
import {usePostForUser, useThreadForUser} from '@hooks/use-activity-pub-queries';

import APAvatar from '@src/components/global/APAvatar';
import APReplyBox from '@src/components/global/APReplyBox';
import BackButton from '@src/components/global/BackButton';
import DeletedFeedItem from '@src/components/feed/DeletedFeedItem';
import FeedItem from '@src/components/feed/FeedItem';
import FeedItemStats from '@src/components/feed/FeedItemStats';
import TableOfContents, {TOCItem} from '@src/components/feed/TableOfContents';
import articleBodyStyles from '@src/components/articleBodyStyles';
import getReadingTime from '../../../utils/get-reading-time';
import {handleProfileClickRR} from '@src/utils/handle-profile-click';
import {isPendingActivity} from '../../../utils/pending-activity';
import {openLinksInNewTab} from '@src/utils/content-formatters';
import {useDebounce} from 'use-debounce';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

interface IframeWindow extends Window {
    resizeIframe?: () => void;
}

const ArticleBody: React.FC<{
    postUrl?: string;
    heading: string;
    image: string|undefined;
    excerpt: string|undefined;
    authors: Array<{
        name: string;
        profile_image: string;
    }>;
    html: string;
    backgroundColor: ColorOption;
    fontSize: FontSize;
    fontStyle: string;
    onHeadingsExtracted?: (headings: TOCItem[]) => void;
    onIframeLoad?: (iframe: HTMLIFrameElement) => void;
    onLoadingChange?: (isLoading: boolean) => void;
    isPopoverOpen: boolean;
}> = ({
    postUrl,
    heading,
    image,
    excerpt,
    authors,
    html,
    backgroundColor,
    fontSize,
    fontStyle,
    onHeadingsExtracted,
    onIframeLoad,
    onLoadingChange,
    isPopoverOpen
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [iframeHeight, setIframeHeight] = useState('0px');
    const darkMode = (document.documentElement.classList.contains('dark') && backgroundColor === 'SYSTEM') || backgroundColor === 'DARK';

    const cssContent = articleBodyStyles();

    const htmlContent = `
        <html class="has-${!darkMode ? 'dark' : 'light'}-text has-${fontStyle}-body ${backgroundColor === 'SEPIA' && 'has-sepia-bg'}">
        <head>
            ${cssContent}
            <style>
                :root {
                    --font-size: ${fontSize};
                }
                body {
                    margin: 0;
                    padding: 0;
                    overflow-y: hidden;
                }
                .has-sepia-bg {
                    --background-color: #FCF8F1;
                }
            </style>

            <script>
                function resizeIframe() {
                    const height = document.body.scrollHeight;
                    window.parent.postMessage({
                        type: 'resize',
                        bodyHeight: height,
                        isLoaded: true
                    }, '*');
                }

                // Initialize resize observers
                function setupResizeObservers() {
                    // ResizeObserver for overall size changes
                    const resizeObserver = new ResizeObserver(() => {
                        resizeIframe();
                    });
                    resizeObserver.observe(document.body);

                    // MutationObserver for DOM changes
                    const mutationObserver = new MutationObserver(() => {
                        resizeIframe();
                    });
                    mutationObserver.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true
                    });

                    // Handle window resize
                    window.addEventListener('resize', resizeIframe);

                    // Initial resize
                    resizeIframe();

                    // Clean up function
                    return () => {
                        resizeObserver.disconnect();
                        mutationObserver.disconnect();
                        window.removeEventListener('resize', resizeIframe);
                    };
                }

                // Wait for images to load
                function waitForImages() {
                    const images = document.getElementsByTagName('img');
                    Promise.all(Array.from(images).map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise(resolve => {
                            img.onload = resolve;
                            img.onerror = resolve;
                        });
                    })).then(resizeIframe);
                }

                // Handle external resize triggers
                window.addEventListener('message', (event) => {
                    if (event.data.type === 'triggerResize') {
                        resizeIframe();
                    }
                });

                // Initialize everything once DOM is ready
                document.addEventListener('DOMContentLoaded', () => {
                    setupResizeObservers();
                    waitForImages();

                    const script = document.createElement('script');
                    script.src = '/public/cards.min.js';
                    document.head.appendChild(script);
                });
            </script>

            <!-- Reframe.js — a plugin that makes iframes and videos responsive -->
            <script>!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).reframe=t()}(this,function(){"use strict";function t(){for(var e=0,t=0,n=arguments.length;t<n;t++)e+=arguments[t].length;for(var i=Array(e),o=0,t=0;t<n;t++)for(var r=arguments[t],f=0,d=r.length;f<d;f++,o++)i[o]=r[f];return i}return function(e,s){return void 0===s&&(s="js-reframe"),("string"==typeof e?t(document.querySelectorAll(e)):"length"in e?t(e):[e]).forEach(function(e){var t,n,i,o,r,f,d,l;-1!==e.className.split(" ").indexOf(s)||-1<e.style.width.indexOf("%")||(i=e.getAttribute("height")||e.offsetHeight,o=e.getAttribute("width")||e.offsetWidth,r=("string"==typeof i?parseInt(i):i)/("string"==typeof o?parseInt(o):o)*100,(f=document.createElement("div")).className=s,(d=f.style).position="relative",d.width="100%",d.paddingTop=r+"%",(l=e.style).position="absolute",l.width="100%",l.height="100%",l.left="0",l.top="0",null!==(t=e.parentNode)&&void 0!==t&&t.insertBefore(f,e),null!==(n=e.parentNode)&&void 0!==n&&n.removeChild(e),f.appendChild(e))})}});</script>
        </head>
        <body>
            <header class='gh-article-header gh-canvas'>
                <h1 class='gh-article-title is-title' data-test-article-heading>${heading}</h1>
                ${excerpt ? `<p class='gh-article-excerpt'>${excerpt}</p>` : ''}
                <a href="${postUrl}" target="_blank" rel="noopener noreferrer" class="gh-article-meta">
                    ${authors && authors.length > 0 ? `
                        <div class="gh-article-author-image">
                        ${authors.map(author => `
                                <span>
                                    ${author.profile_image
        ? `<img src="${author.profile_image}" alt="${author.name}">`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24" width="24"><path d="M6.75 6a5.25 5.25 0 1 0 10.5 0 5.25 5.25 0 1 0 -10.5 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M2.25 23.25a9.75 9.75 0 0 1 19.5 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>`
}
                                </span>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="gh-article-meta-wrapper">
                        ${authors && authors.length > 0 ? `
                            <span class="gh-article-author-name">
                                ${authors.length > 1 ? `${authors[0].name} and ${authors.length - 1} ${authors.length - 1 === 1 ? 'other' : 'others'}` : authors[0].name}
                            </span>
                        ` : ''}
                        <span class="gh-article-source">${postUrl ? new URL(postUrl).hostname : ''} <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link-icon lucide-external-link"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></span>
                    </div>
                </a>
                ${image ? `
                <figure class='gh-article-image'>
                    <img src='${image}' alt='${heading}' />
                </figure>
                ` : ''}
            </header>
            <div class='gh-content gh-canvas is-body'>
                ${openLinksInNewTab(html)}
            </div>
            <script>
                (function () {
                    const sources = [
                        '.gh-content iframe[src*="youtube.com"]',
                        '.gh-content iframe[src*="youtube-nocookie.com"]',
                        '.gh-content iframe[src*="player.vimeo.com"]',
                        '.gh-content iframe[src*="kickstarter.com"][src*="video.html"]',
                        '.gh-content object',
                        '.gh-content embed',
                    ];
                    reframe(document.querySelectorAll(sources.join(',')));
                })();
            </script>
        </body>
        </html>
    `;

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) {
            return;
        }

        if (!iframe.srcdoc) {
            iframe.srcdoc = htmlContent;
        }

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'resize') {
                const newHeight = `${event.data.bodyHeight + 24}px`;
                setIframeHeight(newHeight);
                iframe.style.height = newHeight;

                if (event.data.isLoaded) {
                    setIsLoading(false);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [htmlContent]);

    // Separate effect for style updates
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) {
            return;
        }

        const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDocument) {
            return;
        }

        const root = iframeDocument.documentElement;
        root.style.setProperty('--font-size', fontSize);
        root.classList.remove('has-sans-body', 'has-serif-body');
        root.classList.add(`has-${fontStyle}-body`);
        root.classList.remove('has-dark-text', 'has-light-text');
        root.classList.add(`has-${!darkMode ? 'dark' : 'light'}-text`);
        if (backgroundColor === 'SEPIA') {
            root.classList.add('has-sepia-bg');
        } else {
            root.classList.remove('has-sepia-bg');
        }

        const iframeWindow = iframe.contentWindow as IframeWindow;
        if (iframeWindow && typeof iframeWindow.resizeIframe === 'function') {
            iframeWindow.resizeIframe();
        } else {
            const resizeEvent = new Event('resize');
            iframeDocument.dispatchEvent(resizeEvent);
        }
    }, [fontSize, fontStyle, backgroundColor, darkMode]);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) {
            return;
        }

        const handleLoad = () => {
            if (!iframe.contentDocument) {
                return;
            }

            // Get all headings except the article title
            const headingElements = Array.from(
                iframe.contentDocument.querySelectorAll('h1:not(.gh-article-title), h2, h3, h4, h5, h6')
            );

            if (headingElements.length === 0) {
                return;
            }

            // Find the highest level (smallest number) heading
            const highestLevel = Math.min(
                ...headingElements.map(el => parseInt(el.tagName[1]))
            );

            // Map headings and normalize their levels
            const headings = headingElements.map((el, idx) => {
                const id = `heading-${idx}`;
                el.id = id;

                // Calculate normalized level (e.g., if highest is h3, then h3->h1, h4->h2)
                const actualLevel = parseInt(el.tagName[1]);
                const normalizedLevel = actualLevel - highestLevel + 1;

                return {
                    id,
                    text: el.textContent || '',
                    level: normalizedLevel,
                    element: el as HTMLElement
                };
            });

            onHeadingsExtracted?.(headings);
            onIframeLoad?.(iframe);
        };

        iframe.addEventListener('load', handleLoad);
        return () => iframe.removeEventListener('load', handleLoad);
    }, [onHeadingsExtracted, onIframeLoad]);

    // Update parent when loading state changes
    useEffect(() => {
        onLoadingChange?.(isLoading);
    }, [isLoading, onLoadingChange]);

    return (
        <div className='w-full pb-6'>
            <div className='relative'>
                {isLoading && (
                    <div className='mx-auto mt-6 w-full max-w-[640px]'>
                        <div className='mb-6 flex flex-col gap-2'>
                            <Skeleton className='h-8' />
                            <Skeleton className='h-8 w-full max-w-md' />
                        </div>
                        <Skeleton className='mt-2 h-4' count={4} randomize={true} />
                        <Skeleton className='mt-8 h-[400px]' />
                        <Skeleton className='mt-2 h-4' containerClassName='block mt-7 mb-4' count={8} randomize={true} />
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    id='gh-ap-article-iframe'
                    style={{
                        width: '100%',
                        border: 'none',
                        height: iframeHeight,
                        overflow: 'hidden',
                        opacity: isLoading ? 0 : 1,
                        transition: 'opacity 0.2s ease-in-out',
                        pointerEvents: isPopoverOpen ? 'none' : 'auto'
                    }}
                    title='Embedded Content'
                />
            </div>
        </div>
    );
};

const FeedItemDivider: React.FC = () => (
    <div className="h-px bg-black/[8%] dark:bg-gray-950"></div>
);

interface ReaderProps {
    postId: string;
    onClose?: () => void;
}

export const Reader: React.FC<ReaderProps> = ({
    postId = null,
    onClose
}) => {
    const {
        backgroundColor,
        currentFontSizeIndex,
        fontStyle,
        fontSize,
        handleColorChange,
        setFontStyle,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize
    } = useCustomizerSettings();
    const modalRef = useRef<HTMLElement>(null);
    const [focusReply, setFocusReply] = useState(false);
    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
    const [isTOCOpen, setIsTOCOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('focusReply') === 'true') {
            setFocusReply(true);
        }
    }, [location.search, setFocusReply]);

    const {data: post, isLoading: isLoadingPost} = usePostForUser('index', postId);
    const activityData = post;
    const activityId = activityData?.id;
    const object = activityData?.object;
    const actor = activityData?.actor;
    const authors = activityData?.object.metadata.ghostAuthors;

    const {data: thread, isLoading: isLoadingThread} = useThreadForUser('index', activityId);
    const threadPostIdx = (thread?.posts ?? []).findIndex(item => item.object.id === activityId);
    const threadChildren = (thread?.posts ?? []).slice(threadPostIdx + 1);

    const [replyCount, setReplyCount] = useState(object?.replyCount ?? 0);

    useEffect(() => {
        if (object?.replyCount !== undefined) {
            setReplyCount(object.replyCount);
        }
    }, [object?.replyCount]);

    const onLikeClick = () => {
        // Do API req or smth
        // Don't need to know about setting timeouts or anything like that
    };

    function incrementReplyCount(step: number = 1) {
        setReplyCount((current: number) => current + step);
    }

    function decrementReplyCount(step: number = 1) {
        setReplyCount((current: number) => current - step);
    }

    const replyBoxRef = useRef<HTMLDivElement>(null);
    const repliesRef = useRef<HTMLDivElement>(null);

    const currentMaxWidth = '904px';
    const currentGridWidth = '640px';

    const [readingProgress, setReadingProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Add debounced version of setReadingProgress
    const [debouncedSetReadingProgress] = useDebounce(setReadingProgress, 100);

    const PROGRESS_INCREMENT = 1;

    useEffect(() => {
        const container = modalRef.current;
        const article = document.getElementById('object-content');

        const handleScroll = () => {
            if (isLoading) {
                return;
            }

            if (!container || !article) {
                return;
            }

            const articleRect = article.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const isContentShorterThanViewport = articleRect.height <= containerRect.height;

            if (isContentShorterThanViewport) {
                debouncedSetReadingProgress(100);
                return;
            }

            const scrolledPast = Math.max(0, containerRect.top - articleRect.top);
            const totalHeight = (article as HTMLElement).offsetHeight - (container as HTMLElement).offsetHeight;

            const rawProgress = Math.min(Math.max((scrolledPast / totalHeight) * 100, 0), 100);
            const progress = Math.round(rawProgress / PROGRESS_INCREMENT) * PROGRESS_INCREMENT;

            debouncedSetReadingProgress(progress);
        };

        if (isLoading) {
            return;
        }

        const observer = new MutationObserver(handleScroll);
        if (article) {
            observer.observe(article, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        container?.addEventListener('scroll', handleScroll);
        handleScroll();

        return () => {
            container?.removeEventListener('scroll', handleScroll);
            observer.disconnect();
        };
    }, [isLoading, debouncedSetReadingProgress]);

    const [tocItems, setTocItems] = useState<TOCItem[]>([]);
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
    const [iframeElement, setIframeElement] = useState<HTMLIFrameElement | null>(null);

    const handleHeadingsExtracted = useCallback((headings: TOCItem[]) => {
        setTocItems(headings);
    }, []);

    const handleIframeLoad = useCallback((iframe: HTMLIFrameElement) => {
        setIframeElement(iframe);
    }, []);

    useEffect(() => {
        if (!iframeElement?.contentDocument || !tocItems.length) {
            return;
        }

        const setupObserver = () => {
            const container = modalRef.current;
            if (!container) {
                return;
            }

            const handleScroll = () => {
                const doc = iframeElement.contentDocument;
                if (!doc || !doc.documentElement) {
                    return;
                }

                const scrollTop = container.scrollTop;

                const headings = tocItems
                    .map(item => doc.getElementById(item.id))
                    .filter((el): el is HTMLElement => el !== null)
                    .map(el => ({
                        element: el,
                        id: el.id,
                        top: el.offsetTop
                    }));

                if (!headings.length) {
                    return;
                }

                const buffer = 100;

                let activeHeading = null;

                for (const heading of headings) {
                    if (heading.top - buffer <= scrollTop) {
                        activeHeading = heading;
                    } else {
                        break;
                    }
                }

                setActiveHeadingId(activeHeading?.id || null);
            };

            container.addEventListener('scroll', handleScroll);
            handleScroll();

            return () => {
                container.removeEventListener('scroll', handleScroll);
            };
        };

        const timeoutId = setTimeout(setupObserver, 100);
        return () => clearTimeout(timeoutId);
    }, [iframeElement, tocItems, activeHeadingId]);

    const navigate = useNavigate();

    return (
        <div ref={modalRef as React.RefObject<HTMLDivElement>} className={`max-h-full overflow-auto rounded-md ${backgroundColor === 'DARK' && 'dark'} ${(backgroundColor === 'LIGHT' || backgroundColor === 'SEPIA') && 'light'} ${COLOR_OPTIONS[backgroundColor].background}`}>
            {
                isLoadingPost ? (
                    <LoadingIndicator size='lg' />
                ) : (
                    <>
                        <div className='flex h-full flex-col'>
                            <div className='relative flex-1'>
                                <div className={`sticky top-0 z-50 flex h-[102px] items-center justify-center rounded-t-md border-b ${COLOR_OPTIONS[backgroundColor].background} ${COLOR_OPTIONS[backgroundColor].border}`}>
                                    <div
                                        className='grid w-full px-8'
                                        style={{
                                            gridTemplateColumns: `1fr minmax(0,${currentGridWidth}) 1fr`
                                        }}
                                    >
                                        <div className='flex items-center'>
                                            <BackButton className={COLOR_OPTIONS[backgroundColor].button} onClick={onClose} />
                                        </div>
                                        <div className='col-[2/3] mx-auto flex w-full items-center gap-3'>
                                            <div className='relative z-10 pt-[3px]'>
                                                <APAvatar author={actor}/>
                                            </div>
                                            <div className='relative z-10 flex w-full min-w-0 cursor-pointer flex-col overflow-visible text-[1.5rem]' onClick={e => handleProfileClickRR(actor, navigate, e)}>
                                                <div className='flex w-full'>
                                                    <span className='min-w-0 truncate whitespace-nowrap font-semibold text-black hover:underline dark:text-white'>{actor.name}</span>
                                                </div>
                                                <div className='flex w-full'>
                                                    <span className='text-gray-700 after:mx-1 after:font-normal after:text-gray-700 after:content-["·"]'>{getUsername(actor)}</span>
                                                    <span className='text-gray-700'>{renderTimestamp(object, !object.authored)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className='col-[3/4] flex items-center justify-end gap-2'>
                                            <Customizer
                                                backgroundColor={backgroundColor}
                                                currentFontSizeIndex={currentFontSizeIndex}
                                                fontStyle={fontStyle}
                                                onColorChange={handleColorChange}
                                                onDecreaseFontSize={decreaseFontSize}
                                                onFontStyleChange={setFontStyle}
                                                onIncreaseFontSize={increaseFontSize}
                                                onOpenChange={setIsCustomizerOpen}
                                                onResetFontSize={resetFontSize}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className='relative flex-1'>
                                    <TableOfContents
                                        iframeElement={iframeElement}
                                        modalRef={modalRef}
                                        tocItems={tocItems}
                                        onOpenChange={setIsTOCOpen}
                                    />
                                    <div className='grow overflow-y-auto'>
                                        <div className={`mx-auto px-8 pb-10 pt-5`} style={{maxWidth: currentMaxWidth}}>
                                            <div className='flex flex-col items-center pb-8' id='object-content'>
                                                <ArticleBody
                                                    authors={authors}
                                                    backgroundColor={backgroundColor}
                                                    excerpt={object?.preview?.content ?? ''}
                                                    fontSize={fontSize}
                                                    fontStyle={fontStyle}
                                                    heading={object.name}
                                                    html={object.content ?? ''}
                                                    image={typeof object.image === 'string' ? object.image : object.image?.url}
                                                    isPopoverOpen={isCustomizerOpen || isTOCOpen}
                                                    postUrl={object?.url || ''}
                                                    onHeadingsExtracted={handleHeadingsExtracted}
                                                    onIframeLoad={handleIframeLoad}
                                                    onLoadingChange={setIsLoading}
                                                />
                                                <div className='-ml-3 w-full' style={{maxWidth: currentGridWidth}}>
                                                    <FeedItemStats
                                                        commentCount={replyCount}
                                                        layout={'modal'}
                                                        likeCount={1}
                                                        object={object}
                                                        repostCount={object.repostCount ?? 0}
                                                        onCommentClick={() => {
                                                            repliesRef.current?.scrollIntoView({
                                                                behavior: 'smooth',
                                                                block: 'center'
                                                            });
                                                            setFocusReply(true);
                                                        }}
                                                        onLikeClick={onLikeClick}
                                                    />
                                                </div>
                                            </div>
                                            {object.type === 'Tombstone' && (
                                                <DeletedFeedItem last={true} />
                                            )}

                                            <div ref={replyBoxRef} className='mx-auto w-full border-t border-black/[8%] dark:border-gray-950' style={{maxWidth: currentGridWidth}}>
                                                <APReplyBox
                                                    focused={focusReply ? 1 : 0}
                                                    object={object}
                                                    onReply={incrementReplyCount}
                                                    onReplyError={decrementReplyCount}
                                                />
                                                <FeedItemDivider />
                                            </div>

                                            {isLoadingThread && <LoadingIndicator size='lg' />}

                                            <div ref={repliesRef} className='mx-auto w-full' style={{maxWidth: currentGridWidth}}>
                                                {threadChildren.map((item, index) => {
                                                    const showDivider = index !== threadChildren.length - 1;

                                                    return (
                                                        <React.Fragment key={item.id}>
                                                            <FeedItem
                                                                actor={item.actor}
                                                                allowDelete={item.object.authored}
                                                                commentCount={item.object.replyCount ?? 0}
                                                                isPending={isPendingActivity(item.id)}
                                                                last={true}
                                                                layout='reply'
                                                                object={item.object}
                                                                parentId={object.id}
                                                                repostCount={item.object.repostCount ?? 0}
                                                                type='Note'
                                                                onClick={() => {
                                                                    navigate(`/feed/${encodeURIComponent(item.object.id)}`);
                                                                }}
                                                                onCommentClick={() => {
                                                                    navigate(`/feed/${encodeURIComponent(item.object.id)}?focusReply=true`);
                                                                }}
                                                                onDelete={decrementReplyCount}
                                                            />
                                                            {showDivider && <FeedItemDivider />}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='pointer-events-none !visible sticky bottom-0 hidden items-end justify-between px-10 pb-[42px] lg:!flex'>
                                <div className='pointer-events-auto text-gray-600'>
                                    {getReadingTime(object.content ?? '')}
                                </div>
                                <div key={readingProgress} className='pointer-events-auto min-w-10 text-right text-gray-600 transition-all duration-200 ease-out'>
                                    {readingProgress}%
                                </div>
                            </div>
                        </div>
                    </>
                )
            }
        </div>
    );
};

export default Reader;
