import FeedItem from './FeedItem';
import FeedItemStats from './FeedItemStats';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import articleBodyStyles from '../articleBodyStyles';
import getUsername from '../../utils/get-username';

import {type Activity} from '../activities/ActivityItem';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LoadingIndicator, Modal} from '@tryghost/admin-x-design-system';
import {renderTimestamp} from '../../utils/render-timestamp';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useEffect, useRef, useState} from 'react';
import {useModal} from '@ebay/nice-modal-react';
import {useThreadForUser} from '../../hooks/useActivityPubQueries';

import APAvatar from '../global/APAvatar';
import APReplyBox from '../global/APReplyBox';

interface ArticleModalProps {
    activityId: string;
    object: ObjectProperties;
    actor: ActorProperties;
    focusReply: boolean;
    focusReplies: boolean;
    width?: 'narrow' | 'wide';
    backDrop?: boolean;
    updateActivity: (id: string, updated: Partial<Activity>) => void;
    history: {
        activityId: string;
        object: ObjectProperties;
        actor: ActorProperties;
    }[];
}

const ArticleBody: React.FC<{heading: string, image: string|undefined, excerpt: string|undefined, html: string}> = ({heading, image, excerpt, html}) => {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeHeight, setIframeHeight] = useState('0px');

    const cssContent = articleBodyStyles(siteData?.url.replace(/\/$/, ''));

    const htmlContent = `
  <html>
  <head>
    ${cssContent}
    <style>
      body {
        margin: 0;
        padding: 0;
        overflow-y: hidden;
      }
    </style>
    <script>
      let isFullyLoaded = false;

      function resizeIframe() {
        const finalHeight = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.scrollHeight
        );
        window.parent.postMessage({
          type: 'resize',
          height: finalHeight,
          isLoaded: isFullyLoaded
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
      new MutationObserver(resizeIframe).observe(document.body, { subtree: true, childList: true });
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
        if (iframe) {
            iframe.srcdoc = htmlContent;

            const handleMessage = (event: MessageEvent) => {
                if (event.data.type === 'resize') {
                    setIframeHeight(`${event.data.height}px`);
                    iframe.style.height = `${event.data.height}px`;
                }
            };

            window.addEventListener('message', handleMessage);

            return () => {
                window.removeEventListener('message', handleMessage);
            };
        }
    }, [htmlContent]);

    return (
        <div className='w-full pb-6'>
            <iframe
                ref={iframeRef}
                id='gh-ap-article-iframe'
                style={{
                    width: '100%',
                    border: 'none',
                    height: iframeHeight,
                    overflow: 'hidden'
                }}
                title='Embedded Content'
            />
        </div>
    );
};

const FeedItemDivider: React.FC = () => (
    <div className="h-px bg-grey-200"></div>
);

const ArticleModal: React.FC<ArticleModalProps> = ({
    activityId,
    object,
    actor,
    focusReply,
    focusReplies,
    width = 'narrow',
    backDrop = false,
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
                replyCount: object.replyCount + 1
            }
        } as Partial<Activity>);

        // Update the replyCount on the current activity loaded in the modal
        // This is used for when we navigate via the history
        object.replyCount = object.replyCount + 1;
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

    return (
        <Modal
            align='right'
            allowBackgroundInteraction={true}
            animate={true}
            backDrop={backDrop}
            backDropClick={true}
            footer={<></>}
            height={'full'}
            padding={false}
            size='bleed'
            width={modalSize === MODAL_SIZE_LG ? 'toSidebar' : modalSize}
        >
            <div className='flex h-full flex-col'>
                <div className='sticky top-0 z-50 border-b border-grey-200 bg-white py-8'>
                    <div className={`flex h-8 ${modalSize === MODAL_SIZE_LG ? 'mx-auto w-full max-w-[644px] px-8' : 'px-8'}`}>
                        {(canNavigateBack || (activityThreadParents.length > 0)) ? (
                            <div className='col-[1/2] flex items-center justify-between'>
                                <Button className='transition-color flex h-10 w-10 items-center justify-center rounded-full bg-white hover:bg-grey-100' icon='chevron-left' size='sm' unstyled onClick={navigateBack}/>
                            </div>
                        ) : <div className='flex items-center gap-3'>
                            <div className='relative z-10 pt-[3px]'>
                                <APAvatar author={actor}/>
                            </div>
                            <div className='relative z-10 flex w-full min-w-0 flex-col overflow-visible text-[1.5rem]'>
                                <div className='flex w-full'>
                                    <span className='min-w-0 truncate whitespace-nowrap font-bold after:mx-1 after:font-normal after:text-grey-700 after:content-["·"]'>{actor.name}</span>
                                    <div>{renderTimestamp(object)}</div>
                                </div>
                                <div className='flex w-full'>
                                    <span className='min-w-0 truncate text-grey-700'>{getUsername(actor)}</span>
                                </div>
                            </div>
                        </div>}
                        <div className='col-[2/3] flex grow items-center justify-center px-8 text-center'>
                        </div>
                        <div className='col-[3/4] flex items-center justify-end space-x-6'>
                            <Button className='transition-color flex h-10 w-10 items-center justify-center rounded-full bg-white hover:bg-grey-100' icon='close' size='sm' unstyled onClick={() => modal.remove()}/>
                        </div>
                    </div>
                </div>

                <div className='grow overflow-y-auto'>
                    <div className='mx-auto max-w-[644px] px-8 pb-10 pt-5'>
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
                                showHeader={(canNavigateBack || (activityThreadParents.length > 0)) ? true : false}
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
                            <div className='border-b border-grey-200 pb-8'>
                                <ArticleBody
                                    excerpt={object?.preview?.content}
                                    heading={object.name}
                                    html={object.content}
                                    image={typeof object.image === 'string' ? object.image : object.image?.url}
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
                                    <>
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
                                    </>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(ArticleModal);
