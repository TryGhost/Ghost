import React, {useEffect, useState} from 'react';
// import {SiteData} from '@tryghost/admin-x-framework/api/site';
// import {useGlobalData} from '../../../admin-x-settings/src/components/providers/GlobalDataProvider';

interface Activity {
    id: string;
    type: string;
    summary: string;
    actor: string;
    object: string;
}

interface ObjectContent {
  type: string;
  name: string;
  content: string;
  url: string;
}

const ActivityPubComponent: React.FC = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    // const {siteData} = useGlobalData();
    // console.log(siteData.url);

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                // TODO: Add dynamic site URL instead of the hard-coded one
                // const response = await fetch(`${siteData?.url.replace(/\/$/, '')}/activitypub/outbox/deadbeefdeadbeefdeadbeef`);
                const response = await fetch(`http://localhost:2368/activitypub/outbox/deadbeefdeadbeefdeadbeef`);
                
                if (response.ok) {
                    const data = await response.json();
                    setActivities(data.orderedItems);
                } else {
                    throw new Error('Failed to fetch activities');
                }
            } catch (error) {
                console.error('Error fetching activities:', error);
            }
        };

        fetchActivities();

        // Clean up function if needed
        return () => {
            // Any clean-up code here
        };
    }, []);

    return (
        <div className='mx-auto my-0 w-full max-w-3xl p-12'>
            <h1 className='mb-6 text-black'>My own ActivityPub activities</h1>
            <ul className='flex flex-col'>
                {activities.slice().reverse().map((activity, index) => (
                    // TODO: Fix linting error
                    <li key={index} className='border-1 mb-4 flex flex-col rounded border border-grey-200 p-3'>
                        <p className='text-grey-700'>Activity Type: {activity.type}</p>
                        <p className='text-grey-700'>Summary: {activity.summary}</p>
                        <p className='text-grey-700'>Actor: {activity.actor}</p>
                        <ObjectContentDisplay objectUrl={activity.object} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

const ObjectContentDisplay: React.FC<{ objectUrl: string }> = ({objectUrl}) => {
    const [objectContent, setObjectContent] = useState<ObjectContent | null>(null);

    useEffect(() => {
        const fetchObjectContent = async () => {
            try {
                const response = await fetch(objectUrl);
                if (response.ok) {
                    const data = await response.json();
                    setObjectContent(data);
                } else {
                    throw new Error('Failed to fetch object content');
                }
            } catch (error) {
                console.error('Error fetching object content:', error);
            }
        };

        fetchObjectContent();

        // Clean up function if needed
        return () => {
            // Any clean-up code here
        };
    }, [objectUrl]);

    return (
        <>
            {objectContent && (
                <div>
                    <p className='mb-2 text-grey-700'>Object Type: {objectContent.type}</p>
                    <p className='mb-2 text-2xl font-bold leading-tight tracking-tight text-black'>Name: {objectContent.name}</p>
                    <p className='mb-2 text-grey-950'>Content: {objectContent.content}</p>
                    <p className='mb-2 text-grey-950'>URL: {objectContent.url}</p>
                </div>
            )}
        </>
    );
};

export default ActivityPubComponent;
