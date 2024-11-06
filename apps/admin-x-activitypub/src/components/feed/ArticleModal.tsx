import React, {useEffect, useRef, useState} from 'react';

import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LoadingIndicator, Modal} from '@tryghost/admin-x-design-system';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

import {type Activity} from '../activities/ActivityItem';

import APReplyBox from '../global/APReplyBox';
import FeedItem from './FeedItem';
import articleBodyStyles from '../articleBodyStyles';

import {useThreadForUser} from '../../hooks/useActivityPubQueries';

interface ArticleModalProps {
    activityId: string;
    object: ObjectProperties;
    actor: ActorProperties;
    focusReply: boolean;
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
        <div className='w-full border-b border-grey-200 pb-10'>
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
    updateActivity = () => {},
    history = []
}) => {
    const MODAL_SIZE_SM = 640;
    const [isFocused, setFocused] = useState(focusReply ? 1 : 0);
    function setReplyBoxFocused(focused: boolean) {
        if (focused) {
            setFocused(prev => prev + 1);
        } else {
            setFocused(0);
        }
    }

    const {threadQuery, addToThread} = useThreadForUser('index', activityId);
    const {data: activityThread, isLoading: isLoadingThread} = threadQuery;
    const activtyThreadActivityIdx = (activityThread?.items ?? []).findIndex(item => item.id === activityId);
    const activityThreadChildren = (activityThread?.items ?? []).slice(activtyThreadActivityIdx + 1);
    const activityThreadParents = (activityThread?.items ?? []).slice(0, activtyThreadActivityIdx);

    const [modalSize] = useState<number>(MODAL_SIZE_SM);
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
            history
        });
    };
    const navigateForward = (nextActivityId: string, nextObject: ObjectProperties, nextActor: ActorProperties) => {
        // Trigger the modal to show the next activity and add the existing
        // activity to the history so we can navigate back
        modal.show({
            activityId: nextActivityId,
            object: nextObject,
            actor: nextActor,
            updateActivity,
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

    useEffect(() => {
        if (focusReply && replyBoxRef.current) {
            setTimeout(() => {
                replyBoxRef.current?.scrollIntoView({block: 'center'});
            }, 100);
        }
    }, [focusReply]);

    return (
        <Modal
            align='right'
            animate={true}
            footer={<></>}
            height={'full'}
            padding={false}
            size='bleed'
            width={modalSize}
        >
            <div className='flex h-full flex-col'>
                <div className='sticky top-0 z-50 border-b border-grey-200 bg-white py-3'>
                    <div className='grid h-8 grid-cols-3'>
                        {canNavigateBack && (
                            <div className='col-[1/2] flex items-center justify-between px-8'>
                                <Button icon='chevron-left' size='sm' unstyled onClick={navigateBack}/>
                            </div>
                        )}
                        <div className='col-[2/3] flex grow items-center justify-center px-8 text-center'>
                        </div>
                        <div className='col-[3/4] flex items-center justify-end space-x-6 px-8'>
                            <Button icon='close' size='sm' unstyled onClick={() => modal.remove()}/>
                        </div>
                    </div>
                </div>
                <div className='grow overflow-y-auto'>
                    <div className='mx-auto max-w-[580px] pb-10 pt-5'>
                        {activityThreadParents.map((item) => {
                            return (
                                <>
                                    {item.object.type === 'Article' ? (
                                        <ArticleBody
                                            excerpt={item.object?.preview?.content}
                                            heading={item.object.name}
                                            html={item.object.content}
                                            image={item.object?.image}
                                        />
                                    ) : (
                                        <FeedItem
                                            actor={item.actor}
                                            commentCount={item.object.replyCount ?? 0}
                                            last={false}
                                            layout='reply'
                                            object={item.object}
                                            type='Note'
                                            onClick={() => {
                                                navigateForward(item.id, item.object, item.actor);
                                            }}
                                            onCommentClick={() => {}}
                                        />
                                    )}
                                </>
                            );
                        })}

                        {object.type === 'Note' && (
                            <FeedItem
                                actor={actor}
                                commentCount={object.replyCount ?? 0}
                                last={true}
                                layout={activityThreadParents.length > 0 ? 'modal' : 'modal'}
                                object={object}
                                type='Note'
                                onCommentClick={() => {
                                    setReplyBoxFocused(true);
                                }}
                            />
                        )}
                        {object.type === 'Article' && (
                            <ArticleBody
                                excerpt={object?.preview?.content}
                                heading={object.name}
                                html={object.content}
                                image={object?.image}
                            />
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
                                            navigateForward(item.id, item.object, item.actor);
                                        }}
                                        onCommentClick={() => {}}
                                    />
                                    {showDivider && <FeedItemDivider />}
                                </>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(ArticleModal);
