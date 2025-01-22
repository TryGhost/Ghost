import FeedItem from './FeedItem';
import FeedItemStats from './FeedItemStats';
import NiceModal from '@ebay/nice-modal-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import articleBodyStyles from '../articleBodyStyles';
import getUsername from '../../utils/get-username';
import {OptionProps, SingleValueProps, components} from 'react-select';

import {type Activity} from '../activities/ActivityItem';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Icon, LoadingIndicator, Modal, Popover, Select, SelectOption} from '@tryghost/admin-x-design-system';
import {renderTimestamp} from '../../utils/render-timestamp';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useModal} from '@ebay/nice-modal-react';
import {useThreadForUser} from '../../hooks/useActivityPubQueries';

import APAvatar from '../global/APAvatar';
import APReplyBox from '../global/APReplyBox';
import TableOfContents, {TOCItem} from './TableOfContents';
import getReadingTime from '../../utils/get-reading-time';
import {useDebounce} from 'use-debounce';

interface ArticleModalProps {
    activityId: string;
    object: ObjectProperties;
    actor: ActorProperties;
    focusReply: boolean;
    focusReplies: boolean;
    width?: 'narrow' | 'wide';
    updateActivity: (id: string, updated: Partial<Activity>) => void;
    history: {
        activityId: string;
        object: ObjectProperties;
        actor: ActorProperties;
    }[];
}

interface IframeWindow extends Window {
    resizeIframe?: () => void;
}

const ArticleBody: React.FC<{
    heading: string;
    image: string|undefined;
    excerpt: string|undefined;
    html: string;
    fontSize: FontSize;
    lineHeight: string;
    fontFamily: SelectOption;
    onHeadingsExtracted?: (headings: TOCItem[]) => void;
    onIframeLoad?: (iframe: HTMLIFrameElement) => void;
    onLoadingChange?: (isLoading: boolean) => void;
}> = ({
    heading,
    image,
    excerpt,
    html,
    fontSize,
    lineHeight,
    fontFamily,
    onHeadingsExtracted,
    onIframeLoad,
    onLoadingChange
}) => {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [iframeHeight, setIframeHeight] = useState('0px');

    const cssContent = articleBodyStyles(siteData?.url.replace(/\/$/, ''));

    const htmlContent = `
        <html>
        <head>
            ${cssContent}
            <style>
                :root {
                    --font-size: ${fontSize};
                    --line-height: ${lineHeight};
                    --font-family: ${fontFamily.value};
                    --letter-spacing: ${fontFamily.label === 'Clean sans-serif' ? '-0.013em' : '0'};
                    --content-spacing-factor: ${SPACING_FACTORS[FONT_SIZES.indexOf(fontSize)]};
                }
                body {
                    margin: 0;
                    padding: 0;
                    overflow-y: hidden;
                }
            </style>
            <script>
                let isFullyLoaded = false;

                function resizeIframe() {
                    const bodyHeight = document.body.offsetHeight;

                    window.parent.postMessage({
                        type: 'resize',
                        height: bodyHeight,
                        isLoaded: isFullyLoaded,
                        bodyHeight: bodyHeight
                    }, '*');
                }

                function waitForImages() {
                    const images = document.getElementsByTagName('img');
                    const imagePromises = Array.from(images).map(img => {
                        if (img.complete) {
                            return Promise.resolve();
                        }
                        return new Promise(resolve => {
                            img.onload = resolve;
                            img.onerror = resolve;
                        });
                    });
                    return Promise.all(imagePromises);
                }

                function initializeResize() {
                    resizeIframe();

                    waitForImages().then(() => {
                        isFullyLoaded = true;
                        resizeIframe();
                    });
                }

                window.addEventListener('DOMContentLoaded', initializeResize);
                window.addEventListener('load', resizeIframe);
                window.addEventListener('resize', resizeIframe);

                if (document.body) {
                    const observer = new MutationObserver(resizeIframe);
                    observer.observe(document.body, {
                        subtree: true,
                        childList: true,
                        attributes: true
                    });
                }

                window.addEventListener('message', (event) => {
                    if (event.data.type === 'triggerResize') {
                        resizeIframe();
                    }
                });
            </script>
        </head>
        <body>
            <header class='gh-article-header gh-canvas'>
                <h1 class='gh-article-title is-title' data-test-article-heading>${heading}</h1>
                ${excerpt ? `
                    <p class='gh-article-excerpt'>${excerpt}</p>
                    ` : ''}
                ${image ? `
                <figure class='gh-article-image'>
                    <img src='${image}' alt='${heading}' />
                </figure>
                ` : ''}
            </header>
            <div class='gh-content gh-canvas is-body'>
                ${html}
            </div>
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

        return () => {
            window.removeEventListener('message', handleMessage);
        };
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
        root.style.setProperty('--line-height', lineHeight);
        root.style.setProperty('--font-family', fontFamily.value);
        root.style.setProperty('--letter-spacing', fontFamily.label === 'Clean sans-serif' ? '-0.013em' : '0');
        root.style.setProperty('--content-spacing-factor', SPACING_FACTORS[FONT_SIZES.indexOf(fontSize)]);

        const iframeWindow = iframe.contentWindow as IframeWindow;
        if (iframeWindow && typeof iframeWindow.resizeIframe === 'function') {
            iframeWindow.resizeIframe();
        } else {
            const resizeEvent = new Event('resize');
            iframeDocument.dispatchEvent(resizeEvent);
        }
    }, [fontSize, lineHeight, fontFamily]);

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
                    <div className='absolute inset-0 flex items-center justify-center bg-white/60'>
                        <LoadingIndicator />
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
                        transition: 'opacity 0.2s ease-in-out'
                    }}
                    title='Embedded Content'
                />
            </div>
        </div>
    );
};

const FeedItemDivider: React.FC = () => (
    <div className="h-px bg-grey-200"></div>
);

const FONT_SIZES = ['1.5rem', '1.6rem', '1.7rem', '1.8rem', '2rem'] as const;
const LINE_HEIGHTS = ['1.3', '1.4', '1.5', '1.6', '1.7'] as const;
const SPACING_FACTORS = ['0.85', '1', '1.1', '1.2', '1.3'] as const;

type FontSize = typeof FONT_SIZES[number];

const STORAGE_KEYS = {
    FONT_SIZE: 'ghost-ap-font-size',
    LINE_HEIGHT: 'ghost-ap-line-height',
    FONT_FAMILY: 'ghost-ap-font-family'
} as const;

const MAX_WIDTHS = {
    '1.5rem': '544px',
    '1.6rem': '644px',
    '1.7rem': '684px',
    '1.8rem': '724px',
    '2rem': '764px'
} as const;

const SingleValue: React.FC<SingleValueProps<FontSelectOption, false>> = ({children, ...props}) => (
    <components.SingleValue {...props}>
        <div className='group' data-testid="select-current-option" data-value={props.data.value}>
            <div className='flex items-center gap-2.5'>
                <div className={`${props.data.className} flex h-8 w-8 items-center justify-center rounded-md bg-white text-[1.5rem] font-semibold dark:bg-black`}>Aa</div>
                <span className={`text-md ${props.data.className}`}>{children}</span>
            </div>
        </div>
    </components.SingleValue>
);

const Option: React.FC<OptionProps<FontSelectOption, false>> = ({children, ...props}) => (
    <components.Option {...props}>
        <div className={props.isSelected ? 'relative flex w-full items-center justify-between gap-2' : 'group'} data-testid="select-option" data-value={props.data.value}>
            <div className='flex items-center gap-2.5'>
                <div className='flex h-8 w-8 items-center justify-center rounded-md bg-grey-150 text-[1.5rem] font-semibold group-hover:bg-grey-250 dark:bg-grey-900 dark:group-hover:bg-grey-800'>Aa</div>
                <span className={`text-md ${props.data.className}`}>{children}</span>
            </div>
            {props.isSelected && <span><Icon name='check' size='xs' /></span>}
        </div>
    </components.Option>
);

interface FontSelectOption {
    value: string;
    label: string;
    className?: string;
}

const ArticleModal: React.FC<ArticleModalProps> = ({
    activityId,
    object,
    actor,
    focusReply,
    focusReplies,
    width = 'narrow',
    updateActivity = () => {},
    history = []
}) => {
    const MODAL_SIZE_SM = 640;
    const MODAL_SIZE_LG = 1420;
    const [isFocused] = useState(focusReply ? 1 : 0);

    const {threadQuery, addToThread} = useThreadForUser('index', activityId);
    const {data: activityThread, isLoading: isLoadingThread} = threadQuery;
    const activtyThreadActivityIdx = (activityThread?.items ?? []).findIndex(item => item.id === activityId);
    const activityThreadChildren = (activityThread?.items ?? []).slice(activtyThreadActivityIdx + 1);
    const activityThreadParents = (activityThread?.items ?? []).slice(0, activtyThreadActivityIdx);

    const modalSize = width === 'narrow' ? MODAL_SIZE_SM : MODAL_SIZE_LG;
    const modal = useModal();

    const canNavigateBack = history.length > 0;
    const navigateBack = () => {
        const prevProps = history.pop();

        // This shouldn't happen, but if it does, just remove the modal
        if (!prevProps) {
            modal.remove();

            return;
        }

        modal.show({
            activityId: prevProps.activityId,
            object: prevProps.object,
            actor: prevProps.actor,
            updateActivity,
            width,
            history
        });
    };
    const navigateForward = (nextActivityId: string, nextObject: ObjectProperties, nextActor: ActorProperties, nextFocusReply: boolean) => {
        // Trigger the modal to show the next activity and add the existing
        // activity to the history so we can navigate back

        modal.show({
            activityId: nextActivityId,
            object: nextObject,
            actor: nextActor,
            updateActivity,
            width,
            focusReply: nextFocusReply,
            history: [
                ...history,
                {
                    activityId: activityId,
                    object: object,
                    actor: actor
                }
            ]
        });
    };

    const onLikeClick = () => {
        // Do API req or smth
        // Don't need to know about setting timeouts or anything like that
    };

    function handleNewReply(activity: Activity) {
        // Add the new reply to the thread
        addToThread(activity);

        // Update the replyCount on the activity outside of the context
        // of this component
        updateActivity(activityId, {
            object: {
                ...object,
                replyCount: (object.replyCount ?? 0) + 1
            }
        } as Partial<Activity>);

        // Update the replyCount on the current activity loaded in the modal
        // This is used for when we navigate via the history
        object.replyCount = (object.replyCount ?? 0) + 1;
    }

    const replyBoxRef = useRef<HTMLDivElement>(null);
    const repliesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Combine both scroll behaviors into a single effect
        setTimeout(() => {
            if (focusReply && replyBoxRef.current) {
                replyBoxRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            } else if (focusReplies && repliesRef.current) {
                repliesRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100);
    }, [focusReply, focusReplies]);

    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Initialize state with values from localStorage, falling back to defaults
    const [currentFontSizeIndex, setCurrentFontSizeIndex] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
        return saved ? parseInt(saved) : 1;
    });

    const [currentLineHeightIndex, setCurrentLineHeightIndex] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.LINE_HEIGHT);
        return saved ? parseInt(saved) : 1;
    });

    const [fontFamily, setFontFamily] = useState<SelectOption>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.FONT_FAMILY);
        return saved ? JSON.parse(saved) : {
            value: 'sans-serif',
            label: 'Clean sans-serif'
        };
    });

    // Update localStorage when values change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.FONT_SIZE, currentFontSizeIndex.toString());
    }, [currentFontSizeIndex]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.LINE_HEIGHT, currentLineHeightIndex.toString());
    }, [currentLineHeightIndex]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, JSON.stringify(fontFamily));
    }, [fontFamily]);

    const increaseFontSize = () => {
        setCurrentFontSizeIndex(prevIndex => Math.min(prevIndex + 1, FONT_SIZES.length - 1));
    };

    const decreaseFontSize = () => {
        setCurrentFontSizeIndex(prevIndex => Math.max(prevIndex - 1, 0));
    };

    const increaseLineHeight = () => {
        setCurrentLineHeightIndex(prevIndex => Math.min(prevIndex + 1, LINE_HEIGHTS.length - 1));
    };

    const decreaseLineHeight = () => {
        setCurrentLineHeightIndex(prevIndex => Math.max(prevIndex - 1, 0));
    };

    useEffect(() => {
        const iframe = iframeRef.current;
        if (iframe) {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDocument) {
                iframeDocument.documentElement.style.setProperty('--font-size', FONT_SIZES[currentFontSizeIndex]);
                iframeDocument.documentElement.style.setProperty('--line-height', LINE_HEIGHTS[currentLineHeightIndex]);
                iframeDocument.documentElement.style.setProperty('--font-family', fontFamily.value);
                iframeDocument.documentElement.style.setProperty('--letter-spacing', fontFamily.label === 'Clean sans-serif' ? '-0.013em' : '0');
                iframeDocument.documentElement.style.setProperty('--content-spacing-factor', SPACING_FACTORS[FONT_SIZES.indexOf(FONT_SIZES[currentFontSizeIndex])]);
            }
        }
    }, [currentFontSizeIndex, currentLineHeightIndex, fontFamily]);

    // Get the current max width based on font size
    const currentMaxWidth = MAX_WIDTHS[FONT_SIZES[currentFontSizeIndex]];
    // Calculate the grid column width by subtracting 64px from the current max width
    const currentGridWidth = `${parseInt(currentMaxWidth) - 64}px`;

    const [readingProgress, setReadingProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Add debounced version of setReadingProgress
    const [debouncedSetReadingProgress] = useDebounce(setReadingProgress, 100);

    const PROGRESS_INCREMENT = 5; // Progress is shown in 5% increments (0%, 5%, 10%, etc.)

    useEffect(() => {
        const container = document.querySelector('.overflow-y-auto');
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

    const scrollToHeading = useCallback((id: string) => {
        if (!iframeElement?.contentDocument) {
            return;
        }

        const heading = iframeElement.contentDocument.getElementById(id);
        if (heading) {
            const container = document.querySelector('.overflow-y-auto');
            if (!container) {
                return;
            }

            const headingOffset = heading.offsetTop;

            container.scrollTo({
                top: headingOffset - 120,
                behavior: 'smooth'
            });
        }
    }, [iframeElement]);

    useEffect(() => {
        if (!iframeElement?.contentDocument || !tocItems.length) {
            return;
        }

        const setupObserver = () => {
            const container = document.querySelector('.overflow-y-auto');
            if (!container) {
                return;
            }

            const handleScroll = () => {
                const doc = iframeElement.contentDocument;
                if (!doc || !doc.documentElement) {
                    return;
                }

                const headings = tocItems
                    .map(item => doc.getElementById(item.id))
                    .filter((el): el is HTMLElement => el !== null)
                    .map(el => ({
                        element: el,
                        id: el.id,
                        position: el.getBoundingClientRect().top - container.getBoundingClientRect().top
                    }));

                if (!headings.length) {
                    return;
                }

                // Find the last visible heading
                const viewportCenter = container.clientHeight / 2;
                const buffer = 100;

                // Find the last heading that's above the viewport center
                const lastVisibleHeading = headings.reduce((last, current) => {
                    if (current.position < (viewportCenter + buffer)) {
                        return current;
                    }
                    return last;
                }, headings[0]);

                if (lastVisibleHeading && lastVisibleHeading.element.id !== activeHeadingId) {
                    setActiveHeadingId(lastVisibleHeading.element.id);
                }
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

    return (
        <Modal
            align='right'
            allowBackgroundInteraction={false}
            animate={true}
            backDrop={false}
            backDropClick={true}
            footer={<></>}
            height={'full'}
            padding={false}
            scrolling={true}
            size='bleed'
            width={modalSize === MODAL_SIZE_LG ? 'toSidebar' : modalSize}
        >
            <div className='flex h-full flex-col'>
                <div className='sticky top-0 z-50 flex h-[97px] items-center justify-center border-b border-grey-200 bg-white'>
                    <div
                        className={`w-full ${modalSize === MODAL_SIZE_LG ? 'grid px-8' : 'flex justify-between gap-2 px-8'}`}
                        style={modalSize === MODAL_SIZE_LG ? {
                            gridTemplateColumns: `1fr minmax(0,${currentGridWidth}) 1fr`
                        } : undefined}
                    >
                        {(canNavigateBack || (activityThreadParents.length > 0)) ? (
                            <div className='col-[1/2] flex items-center justify-between'>
                                <Button className='transition-color flex h-10 w-10 items-center justify-center rounded-full bg-white hover:bg-grey-100' icon='arrow-left' size='sm' unstyled onClick={navigateBack}/>
                            </div>
                        ) : (<div className='col-[2/3] mx-auto flex w-full items-center gap-3'>
                            <div className='relative z-10 pt-[3px]'>
                                <APAvatar author={actor}/>
                            </div>
                            <div className='relative z-10 flex w-full min-w-0 flex-col overflow-visible text-[1.5rem]'>
                                <div className='flex w-full'>
                                    <span className='min-w-0 truncate whitespace-nowrap font-bold'>{actor.name}</span>
                                </div>
                                <div className='flex w-full'>
                                    <span className='text-grey-700 after:mx-1 after:font-normal after:text-grey-700 after:content-["·"]'>{getUsername(actor)}</span>
                                    <span className='text-grey-700'>{renderTimestamp(object)}</span>
                                </div>
                            </div>
                        </div>)}
                        <div className='col-[3/4] flex items-center justify-end gap-2'>
                            {modalSize === MODAL_SIZE_LG && object.type === 'Article' && <Popover position='end' trigger={ <Button className='transition-color flex h-10 w-10 items-center justify-center rounded-full bg-white hover:bg-grey-100' icon='typography' size='sm' unstyled onClick={() => {}}/>
                            }>
                                <div className='flex min-w-[300px] flex-col p-5'>
                                    <Select
                                        className='mb-3'
                                        components={{Option, SingleValue}}
                                        controlClasses={{control: '!min-h-[40px] !py-0 !pl-1', option: '!pl-1 !py-[4px]'}}
                                        options={[
                                            {
                                                value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                                                label: 'Clean sans-serif',
                                                className: 'font-sans'
                                            },
                                            {
                                                value: 'Georgia, Times, serif',
                                                label: 'Elegant serif',
                                                className: 'font-serif'
                                            }
                                        ]}
                                        title='Typeface'
                                        value={fontFamily}
                                        onSelect={option => setFontFamily(option || {
                                            value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                                            label: 'Clean sans-serif',
                                            className: 'font-sans'
                                        })}
                                    />
                                    <div className='mb-2 flex items-center justify-between'>
                                        <span className='text-sm font-medium text-grey-900'>Font size</span>
                                        <div className='flex items-center'>
                                            <Button
                                                className={`transition-color flex h-8 w-8 items-center justify-center rounded-full bg-white ${currentFontSizeIndex === 0 ? 'opacity-20 hover:bg-white' : 'hover:bg-grey-100'}`}
                                                disabled={currentFontSizeIndex === 0}
                                                hideLabel={true}
                                                icon='substract'
                                                iconSize='xs'
                                                label='Decrease font size'
                                                unstyled={true}
                                                onClick={decreaseFontSize}
                                            />
                                            <Button
                                                className={`transition-color flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-grey-100 ${currentFontSizeIndex === FONT_SIZES.length - 1 ? 'opacity-20 hover:bg-white' : 'hover:bg-grey-100'}`}
                                                disabled={currentFontSizeIndex === FONT_SIZES.length - 1}
                                                hideLabel={true}
                                                icon='add'
                                                iconSize='xs'
                                                label='Increase font size'
                                                unstyled={true}
                                                onClick={increaseFontSize}
                                            />
                                        </div>
                                    </div>
                                    <div className='mb-5 flex items-center justify-between'>
                                        <span className='text-sm font-medium text-grey-900'>Line spacing</span>
                                        <div className='flex items-center'>
                                            <Button
                                                className={`transition-color flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-grey-100 ${currentLineHeightIndex === 0 ? 'opacity-20 hover:bg-white' : 'hover:bg-grey-100'}`}
                                                disabled={currentLineHeightIndex === 0}
                                                hideLabel={true}
                                                icon='substract'
                                                iconSize='xs'
                                                label='Decrease line spacing'
                                                unstyled={true}
                                                onClick={decreaseLineHeight}
                                            />
                                            <Button
                                                className={`transition-color flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-grey-100 ${currentLineHeightIndex === LINE_HEIGHTS.length - 1 ? 'opacity-20 hover:bg-white' : 'hover:bg-grey-100'}`}
                                                disabled={currentLineHeightIndex === LINE_HEIGHTS.length - 1}
                                                hideLabel={true}
                                                icon='add'
                                                iconSize='xs'
                                                label='Increase line spacing'
                                                unstyled={true}
                                                onClick={increaseLineHeight}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        className="text-sm text-grey-600 hover:text-grey-700"
                                        label="Reset to default"
                                        link={true}
                                        onClick={() => {
                                            setCurrentFontSizeIndex(1); // Default font size
                                            setCurrentLineHeightIndex(1); // Default line height
                                            setFontFamily({
                                                value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                                                label: 'Clean sans-serif'
                                            });
                                        }}
                                    />
                                </div>
                            </Popover>}
                            <Button className='transition-color flex h-10 w-10 items-center justify-center rounded-full bg-white hover:bg-grey-100' icon='close' size='sm' unstyled onClick={() => modal.remove()}/>
                        </div>
                    </div>
                </div>
                <div className='relative flex-1'>
                    {modalSize === MODAL_SIZE_LG && object.type === 'Article' && tocItems.length > 0 && (
                        <div className="!visible absolute inset-y-0 right-7 z-40 hidden lg:!block">
                            <div className="sticky top-1/2 -translate-y-1/2">
                                <TableOfContents
                                    items={tocItems}
                                    onItemClick={scrollToHeading}
                                />
                            </div>
                        </div>
                    )}
                    <div className='grow overflow-y-auto'>
                        <div className={`mx-auto px-8 pb-10 pt-5`} style={{maxWidth: currentMaxWidth}}>
                            {activityThreadParents.map((item) => {
                                return (
                                    <>
                                        <FeedItem
                                            actor={item.actor}
                                            commentCount={item.object.replyCount ?? 0}
                                            last={false}
                                            layout='reply'
                                            object={item.object}
                                            type='Note'
                                            onClick={() => {
                                                navigateForward(item.id, item.object, item.actor, false);
                                            }}
                                            onCommentClick={() => {
                                                navigateForward(item.id, item.object, item.actor, true);
                                            }}
                                        />
                                    </>
                                );
                            })}

                            {object.type === 'Note' && (
                                <FeedItem
                                    actor={actor}
                                    commentCount={object.replyCount ?? 0}
                                    last={true}
                                    layout={'modal'}
                                    object={object}
                                    showHeader={(canNavigateBack || (activityThreadParents.length > 0))}
                                    type='Note'
                                    onCommentClick={() => {
                                        repliesRef.current?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center'
                                        });
                                    }}
                                />
                            )}
                            {object.type === 'Article' && (
                                <div className='border-b border-grey-200 pb-8' id='object-content'>
                                    <ArticleBody
                                        excerpt={object?.preview?.content ?? ''}
                                        fontFamily={fontFamily}
                                        fontSize={FONT_SIZES[currentFontSizeIndex]}
                                        heading={object.name}
                                        html={object.content ?? ''}
                                        image={typeof object.image === 'string' ? object.image : object.image?.url}
                                        lineHeight={LINE_HEIGHTS[currentLineHeightIndex]}
                                        onHeadingsExtracted={handleHeadingsExtracted}
                                        onIframeLoad={handleIframeLoad}
                                        onLoadingChange={setIsLoading}
                                    />
                                    <div className='ml-[-7px]'>
                                        <FeedItemStats
                                            commentCount={object.replyCount ?? 0}
                                            layout={'modal'}
                                            likeCount={1}
                                            object={object}
                                            onCommentClick={() => {
                                                repliesRef.current?.scrollIntoView({
                                                    behavior: 'smooth',
                                                    block: 'center'
                                                });
                                            }}
                                            onLikeClick={onLikeClick}
                                        />
                                    </div>
                                </div>
                            )}

                            <div ref={replyBoxRef}>
                                <APReplyBox
                                    focused={isFocused}
                                    object={object}
                                    onNewReply={handleNewReply}
                                />
                            </div>
                            <FeedItemDivider />

                            {isLoadingThread && <LoadingIndicator size='lg' />}

                            <div ref={repliesRef}>
                                {activityThreadChildren.map((item, index) => {
                                    const showDivider = index !== activityThreadChildren.length - 1;

                                    return (
                                        <React.Fragment key={item.id}>
                                            <FeedItem
                                                actor={item.actor}
                                                commentCount={item.object.replyCount ?? 0}
                                                last={true}
                                                layout='reply'
                                                object={item.object}
                                                type='Note'
                                                onClick={() => {
                                                    navigateForward(item.id, item.object, item.actor, false);
                                                }}
                                                onCommentClick={() => {
                                                    navigateForward(item.id, item.object, item.actor, true);
                                                }}
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
            {modalSize === MODAL_SIZE_LG && object.type === 'Article' && (
                <div className='pointer-events-none !visible sticky bottom-0 hidden items-end justify-between px-10 pb-[42px] lg:!flex'>
                    <div className='pointer-events-auto text-grey-600'>
                        {getReadingTime(object.content ?? '')}
                    </div>
                    <div className='pointer-events-auto text-grey-600 transition-all duration-200 ease-out'>
                        {readingProgress}%
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default NiceModal.create(ArticleModal);
