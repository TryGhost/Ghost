import React, {useEffect, useRef, useState} from 'react';

import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Modal} from '@tryghost/admin-x-design-system';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

import FeedItem from './FeedItem';

import APReplyBox from '../global/APReplyBox';
import articleBodyStyles from '../articleBodyStyles';
import {type Activity} from '../activities/ActivityItem';

interface ArticleModalProps {
    object: ObjectProperties;
    actor: ActorProperties;
    comments: Activity[];
    focusReply: boolean;
}

const ArticleBody: React.FC<{heading: string, image: string|undefined, excerpt: string|undefined, html: string}> = ({heading, image, excerpt, html}) => {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const cssContent = articleBodyStyles(siteData?.url.replace(/\/$/, ''));

    const htmlContent = `
  <html>
  <head>
    ${cssContent}
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
        }
    }, [htmlContent]);

    return (
        <div>
            <iframe
                ref={iframeRef}
                className={`h-[calc(100vh_-_3vmin_-_4.8rem_-_2px)]`}
                height='100%'
                id='gh-ap-article-iframe'
                title='Embedded Content'
                width='100%'
            >
            </iframe>
        </div>
    );
};

const FeedItemDivider: React.FC = () => (
    <div className="h-px bg-grey-200"></div>
);

const ArticleModal: React.FC<ArticleModalProps> = ({object, actor, comments, focusReply}) => {
    const MODAL_SIZE_SM = 640;
    // const MODAL_SIZE_LG = 2800;
    const [commentsState, setCommentsState] = useState(comments);
    const [isFocused, setFocused] = useState(focusReply ? 1 : 0);
    function setReplyBoxFocused(focused: boolean) {
        if (focused) {
            setFocused(prev => prev + 1);
        } else {
            setFocused(0);
        }
    }

    const [modalSize] = useState<number>(MODAL_SIZE_SM);
    const modal = useModal();

    // Navigation stack to navigate between comments - This could probably use a
    // more robust solution, but for now, thanks to the fact modal.show() updates
    // the existing modal instead of creating a new one (i think 😅) we can use
    // a stack to navigate between comments pretty easily
    //
    // @TODO: Look into a more robust solution for navigation
    const [navigationStack, setNavigationStack] = useState<[ObjectProperties, ActorProperties, Activity[]][]>([]);
    const [canNavigateBack, setCanNavigateBack] = useState(false);
    const navigateBack = () => {
        const [previousObject, previousActor, previousComments] = navigationStack.pop() ?? [];

        if (navigationStack.length === 0) {
            setCanNavigateBack(false);
        }

        modal.show({
            object: previousObject,
            actor: previousActor,
            comments: previousComments
        });
    };
    const navigateForward = (nextObject: ObjectProperties, nextActor: ActorProperties, nextComments: Activity[]) => {
        setCanNavigateBack(true);
        setNavigationStack([...navigationStack, [object, actor, commentsState]]);

        modal.show({
            object: nextObject,
            actor: nextActor,
            comments: nextComments
        });
    };
    // const toggleModalSize = () => {
    //     setModalSize(modalSize === MODAL_SIZE_SM ? MODAL_SIZE_LG : MODAL_SIZE_SM);
    // };

    function handleNewReply(activity: Activity) {
        setCommentsState(prev => [activity].concat(prev));
    }

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
            <div className='sticky top-0 z-50 border-grey-200 bg-white py-3'>
                <div className='grid h-8 grid-cols-3'>
                    {canNavigateBack && (
                        <div className='col-[1/2] flex items-center justify-between px-8'>
                            <Button icon='chevron-left' size='sm' unstyled onClick={navigateBack}/>
                        </div>
                    )}
                    <div className='col-[2/3] flex grow items-center justify-center px-8 text-center'>
                    </div>
                    <div className='col-[3/4] flex items-center justify-end space-x-6 px-8'>
                        {/* <Button icon='angle-brackets' size='md' unstyled onClick={toggleModalSize}/> */}
                        <Button icon='close' size='sm' unstyled onClick={() => modal.remove()}/>
                    </div>
                </div>
            </div>
            <div className='mt-10 w-auto'>
                {object.type === 'Note' && (
                    <div className='mx-auto max-w-[580px] pb-16'>
                        <FeedItem
                            actor={actor}
                            comments={comments}
                            layout='modal'
                            object={object}
                            type='Note'
                            onCommentClick={() => {
                                setReplyBoxFocused(true);
                            }}
                        />
                        <APReplyBox focused={isFocused} object={object} onNewReply={handleNewReply}/>
                        <FeedItemDivider />

                        {commentsState.map((comment, index) => {
                            const showDivider = index !== comments.length - 1;
                            const nestedComments = comment.object.replies ?? [];
                            const hasNestedComments = nestedComments.length > 0;

                            return (
                                <>
                                    <FeedItem
                                        actor={comment.actor}
                                        comments={nestedComments}
                                        last={true}
                                        layout='reply'
                                        object={comment.object}
                                        type='Note'
                                        onClick={() => {
                                            navigateForward(comment.object, comment.actor, nestedComments);
                                        }}
                                        onCommentClick={() => {}}
                                    />
                                    {hasNestedComments && <FeedItemDivider />}
                                    {nestedComments.map((nestedComment, nestedCommentIndex) => {
                                        const nestedNestedComments = nestedComment.object.replies ?? [];

                                        return (
                                            <FeedItem
                                                actor={nestedComment.actor}
                                                comments={nestedNestedComments}
                                                last={nestedComments.length === nestedCommentIndex + 1}
                                                layout='reply'
                                                object={nestedComment.object}
                                                type='Note'
                                                onClick={() => {
                                                    navigateForward(nestedComment.object, nestedComment.actor, nestedNestedComments);
                                                }}
                                                onCommentClick={() => {}}
                                            />
                                        );
                                    })}
                                    {showDivider && <FeedItemDivider />}
                                </>
                            );
                        })}
                    </div>
                )}
                {object.type === 'Article' && (
                    <ArticleBody excerpt={object?.preview?.content} heading={object.name} html={object.content} image={object?.image} />
                )}
            </div>
        </Modal>
    );
};

export default NiceModal.create(ArticleModal);
