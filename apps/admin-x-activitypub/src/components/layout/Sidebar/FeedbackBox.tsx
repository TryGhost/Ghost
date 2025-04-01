import ArticleModal from '@src/components/feed/ArticleModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, H4, LucideIcon} from '@tryghost/shade';

const FeedbackBox: React.FC = () => {
    function showFeedbackReply() {
        const targetPostId = 'https://activitypub.ghost.org/.ghost/activitypub/note/84eb47c6-4e5d-4d1a-bb6e-089a5890cc2';

        NiceModal.show(ArticleModal, {
            activityId: targetPostId,
            object: {
                content: `<p>Welcome to the Ghost social web beta!</p><p>We’d love to hear your thoughts and feedback. Reply to this note to let us know what’s working well, and what isn’t.</p>`,
                id: targetPostId,
                published: '2025-03-17T09:45:00Z',
                type: 'Note',
                url: targetPostId,
                '@context': '',
                name: ''
            } as ObjectProperties,
            actor: {
                id: 'https://activitypub.ghost.org/.ghost/activitypub/users/index',
                icon: {
                    url: 'https://activitypub.ghost.org/content/images/2024/09/ghost-orb-white-squircle-07.png'
                },
                name: 'Building ActivityPub',
                preferredUsername: 'index',
                summary: 'Ghost is federating over ActivityPub to become part of the world’s largest publishing network',
                url: 'https://activitypub.ghost.org/'
            } as ActorProperties,
            focusReply: true,
            width: 'narrow',
            disableStats: true
        });
    }

    return (
        <div className='z-20 w-full bg-white dark:bg-black'>
            <div className='flex w-full flex-col gap-0.5 border-t border-gray-200 bg-white px-3 pt-6 dark:border-gray-950 dark:bg-black'>
                <div className='flex items-center gap-2'>
                    <LucideIcon.MessageSquare className='text-purple-500' size={20} strokeWidth={1.5} />
                    <H4>Beta feedback</H4>
                </div>
                <span className='text-sm text-gray-700'>
                Something not working? Let us know
                </span>
                <Button className='mt-2 dark:bg-gray-925/70 dark:hover:bg-gray-900' variant='secondary' onClick={showFeedbackReply}>Send feedback</Button>
            </div>
            <div className='-mb-1 ml-3 flex items-center gap-1.5 pb-2 pt-4 text-xs text-gray-400'>
                <a className='text-xs font-medium text-gray-700 hover:text-black dark:text-gray-800 dark:hover:text-white' href="https://ghost.org/help/social-web/" rel="noreferrer" target="_blank">Help</a>
                &sdot;
                <a className='text-xs font-medium text-gray-700 hover:text-black dark:text-gray-800 dark:hover:text-white' href="https://activitypub.ghost.org/archive" rel="noreferrer"target="_blank">Updates</a>
            </div>
        </div>
    );
};

export default FeedbackBox;
