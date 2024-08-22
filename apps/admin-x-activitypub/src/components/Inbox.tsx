import ActivityPubWelcomeImage from '../assets/images/ap-welcome.png';
import ArticleModal from './feed/ArticleModal';
import FeedItem from './feed/FeedItem';
import MainNavigation from './navigation/MainNavigation';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {Activity} from './activities/ActivityItem';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading} from '@tryghost/admin-x-design-system';
import {useBrowseInboxForUser} from '../MainContent';

interface InboxProps {}

const Inbox: React.FC<InboxProps> = ({}) => {
    const {data: activities = []} = useBrowseInboxForUser('index');
    const [, setArticleContent] = useState<ObjectProperties | null>(null);
    const [, setArticleActor] = useState<ActorProperties | null>(null);
    const [layout, setLayout] = useState('inbox');

    const inboxTabActivities = activities.filter((activity: Activity) => {
        const isCreate = activity.type === 'Create' && ['Article', 'Note'].includes(activity.object.type);
        const isAnnounce = activity.type === 'Announce' && activity.object.type === 'Note';

        return isCreate || isAnnounce;
    });

    const handleViewContent = (object: ObjectProperties, actor: ActorProperties) => {
        setArticleContent(object);
        setArticleActor(actor);
        NiceModal.show(ArticleModal, {
            object: object,
            actor: actor
        });
    };

    const handleLayoutChange = (newLayout: string) => {
        setLayout(newLayout);
    };

    return (
        <>
            <MainNavigation page='home' title="Home" onLayoutChange={handleLayoutChange} />
            <div className='z-0 my-5 flex w-full flex-col'>
                <div className='w-full'>
                    {inboxTabActivities.length > 0 ? (
                        <ul className='mx-auto flex max-w-[640px] flex-col'>
                            {inboxTabActivities.reverse().map(activity => (
                                <li
                                    key={activity.id}
                                    data-test-view-article
                                    onClick={() => handleViewContent(activity.object, activity.actor)}
                                >
                                    <FeedItem
                                        actor={activity.actor}
                                        layout={layout}
                                        object={activity.object}
                                        type={activity.type}
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className='flex items-center justify-center text-center'>
                            <div className='flex max-w-[32em] flex-col items-center justify-center gap-4'>
                                <img
                                    alt='Ghost site logos'
                                    className='w-[220px]'
                                    src={ActivityPubWelcomeImage}
                                />
                                <Heading className='text-balance' level={2}>
                        Welcome to ActivityPub
                                </Heading>
                                <p className='text-pretty text-grey-800'>
                        We’re so glad to have you on board! At the moment, you can follow other Ghost sites and enjoy their content right here inside Ghost.
                                </p>
                                <p className='text-pretty text-grey-800'>
                        You can see all of the users on the right—find your favorite ones and give them a follow.
                                </p>
                                <Button color='green' label='Learn more' link={true} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Inbox;