import ActivityPubWelcomeImage from '../assets/images/ap-welcome.png';
import React, {useState} from 'react';
import {ActivityPubAPI} from '../api/activitypub';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading} from '@tryghost/admin-x-design-system';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useQuery} from '@tanstack/react-query';

type Activity = {
    type: string,
    object: {
        type: string
    }
}

function useBrowseInboxForUser(handle: string) {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const siteUrl = siteData?.url ?? window.location.origin;
    const api = new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
    return useQuery({
        queryKey: [`inbox:${handle}`],
        async queryFn() {
            return api.getInbox();
        }
    });
}

interface InboxProps {}

const Inbox: React.FC<InboxProps> = ({}) => {
    const {data: activities = []} = useBrowseInboxForUser('index');
    const [, setArticleContent] = useState<ObjectProperties | null>(null);
    const [, setArticleActor] = useState<ActorProperties | null>(null);

    const inboxTabActivities = activities.filter((activity: Activity) => {
        const isCreate = activity.type === 'Create' && ['Article', 'Note'].includes(activity.object.type);
        const isAnnounce = activity.type === 'Announce' && activity.object.type === 'Note';

        return isCreate || isAnnounce;
    });

    const handleViewContent = (object: ObjectProperties, actor: ActorProperties) => {
        setArticleContent(object);
        setArticleActor(actor);
    };

    return (
        <div className='w-full'>
            {inboxTabActivities.length > 0 ? (
                <ul className='mx-auto flex max-w-[540px] flex-col py-8'>
                    {inboxTabActivities.reverse().map(activity => (
                        <li
                            key={activity.id}
                            data-test-view-article
                            onClick={() => handleViewContent(activity.object, activity.actor)}
                        >
                            {/* <ObjectContentDisplay
                                actor={activity.actor}
                                layout={selectedOption.value}
                                object={activity.object}
                                type={activity.type}
                            /> */}
                            tha thing
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
    );
};

export default Inbox;