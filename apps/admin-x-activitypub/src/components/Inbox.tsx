import ActivityPubWelcomeImage from '../assets/images/ap-welcome.png';
import ArticleModal from './feed/ArticleModal';
import FeedItem from './feed/FeedItem';
import MainNavigation from './navigation/MainNavigation';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {type Activity} from './activities/ActivityItem';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading} from '@tryghost/admin-x-design-system';
import {useAllActivitiesForUser} from '../hooks/useActivityPubQueries';

interface InboxProps {}

const Inbox: React.FC<InboxProps> = ({}) => {
    const [, setArticleContent] = useState<ObjectProperties | null>(null);
    const [, setArticleActor] = useState<ActorProperties | null>(null);
    const [layout, setLayout] = useState('inbox');

    // Retrieve all activities for the user
    let {data: activities = []} = useAllActivitiesForUser({handle: 'index'});

    activities = activities.filter((activity: Activity) => {
        const isCreate = activity.type === 'Create' && ['Article', 'Note'].includes(activity.object.type);
        const isAnnounce = activity.type === 'Announce' && activity.object.type === 'Note';

        return isCreate || isAnnounce;
    });

    // Create a map of activity comments, grouping them by the parent activity
    // This allows us to quickly look up all comments for a given activity
    const commentsMap = new Map<string, Activity[]>();

    for (const activity of activities) {
        if (activity.type === 'Create' && activity.object.inReplyTo) {
            const comments = commentsMap.get(activity.object.inReplyTo) ?? [];

            comments.push(activity);

            commentsMap.set(activity.object.inReplyTo, comments.reverse());
        }
    }

    const getCommentsForObject = (id: string) => {
        return commentsMap.get(id) ?? [];
    };

    const handleViewContent = (object: ObjectProperties, actor: ActorProperties, comments: Activity[]) => {
        setArticleContent(object);
        setArticleActor(actor);
        NiceModal.show(ArticleModal, {object, actor, comments, allComments: commentsMap});
    };

    function getContentAuthor(activity: Activity) {
        const actor = activity.actor;
        const attributedTo = activity.object.attributedTo;

        if (!attributedTo) {
            return actor;
        }

        if (typeof attributedTo === 'string') {
            return actor;
        }

        if (Array.isArray(attributedTo)) {
            const found = attributedTo.find(item => typeof item !== 'string');
            if (found) {
                return found;
            } else {
                return actor;
            }
        }

        return attributedTo;
    }

    const handleLayoutChange = (newLayout: string) => {
        setLayout(newLayout);
    };

    return (
        <>
            <MainNavigation page='home' title="Home" onLayoutChange={handleLayoutChange} />
            <div className='z-0 my-5 flex w-full flex-col'>
                <div className='w-full'>
                    {activities.length > 0 ? (
                        <ul className='mx-auto flex max-w-[640px] flex-col'>
                            {activities.map((activity, index) => (
                                <li
                                    key={activity.id}
                                    data-test-view-article
                                    onClick={() => handleViewContent(
                                        activity.object,
                                        getContentAuthor(activity),
                                        getCommentsForObject(activity.object.id)
                                    )}
                                >
                                    <FeedItem
                                        actor={activity.actor}
                                        comments={getCommentsForObject(activity.object.id)}
                                        layout={layout}
                                        object={activity.object}
                                        type={activity.type}
                                    />
                                    {index < activities.length - 1 && (
                                        <div className="h-px w-full bg-grey-200"></div>
                                    )}
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
