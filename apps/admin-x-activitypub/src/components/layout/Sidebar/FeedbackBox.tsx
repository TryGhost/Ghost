import ArticleModal from '@src/components/feed/ArticleModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, H4, LucideIcon} from '@tryghost/shade';
import {useFeatureFlags} from '@src/lib/feature-flags';

const FeedbackBox: React.FC = () => {
    const {isEnabled} = useFeatureFlags();

    function showFeedbackReply() {
        const targetPostId = 'https://main.ghost.org/.ghost/activitypub/note/abfa416f-30ee-4aa9-be3b-b763aa2547fe';

        NiceModal.show(ArticleModal, {
            activityId: targetPostId,
            object: {
                content: `<p>Thank you for trying the beta version of Social web in Ghost! We'd love to hear what you think — your feedback will help us fine-tune the experience.</p><p>If you've run into any issues or have suggestions, just leave a reply to this note and let us know.</p>`,
                id: targetPostId,
                published: '2025-03-10T15:00:58Z',
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
        <div className='sticky bottom-0 z-20 w-full bg-white dark:bg-black'>
            {isEnabled('feedback') &&
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
            }
            <div className='-mb-1 ml-3 flex items-center gap-1.5 pt-4 text-xs text-gray-400'>
                <a className='text-xs font-medium text-gray-700 hover:text-black dark:text-gray-800 dark:hover:text-white' href="https://ghost.org/help/social-web/" rel="noreferrer" target="_blank">Help</a>
                &sdot;
                <a className='text-xs font-medium text-gray-700 hover:text-black dark:text-gray-800 dark:hover:text-white' href="https://activitypub.ghost.org/archive" rel="noreferrer"target="_blank">Updates</a>
            </div>
        </div>
    );
};

export default FeedbackBox;