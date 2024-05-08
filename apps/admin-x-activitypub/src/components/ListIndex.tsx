import React, {useEffect, useState} from 'react';
import {Heading, Icon, Page, ViewContainer} from '@tryghost/admin-x-design-system';
import {SiteData, useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface Activity {
    id: string;
    type: string;
    summary: string;
    actor: string;
    object: string;
    siteData: SiteData;
}

interface ObjectContent {
  type: string;
  name: string;
  content: string;
  url: string;
}

const ActivityPubComponent: React.FC = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const {updateRoute} = useRouting();

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const response = await fetch(`${siteData?.url.replace(/\/$/, '')}/activitypub/outbox/deadbeefdeadbeefdeadbeef`);
                // console.log('Fetching activities from:', siteData?.url.replace(/\/$/, '') + '/activitypub/outbox/deadbeefdeadbeefdeadbeef');
                
                if (response.ok) {
                    const data = await response.json();
                    setActivities(data.orderedItems);
                } else {
                    throw new Error('Failed to fetch activities');
                }
            } catch (error) {
                // console.error('Error fetching activities:', error);
            }
        };

        fetchActivities();

        // Clean up function if needed
        return () => {
            // Any clean-up code here
        };
    }, [siteData]);

    return (
        <Page>
            <ViewContainer
                // actions={dummyActions}
                primaryAction={{
                    title: 'Follow',
                    onClick: () => {
                        updateRoute('follow-site');
                    },
                    icon: 'add'
                }}
                title='Outbox'
                toolbarBorder={false}
                type='page'
            >
                <div className='grid grid-cols-6 items-start gap-6'>
                    <ul className='col-span-4 flex flex-col'>
                        {activities.slice().reverse().map(activity => (
                            <li key={activity.id}>
                                {/* <p className='text-grey-700'>Activity Type: {activity.type}</p>
                                <p className='text-grey-700'>Summary: {activity.summary}</p>
                                <p className='text-grey-700'>Actor: {activity.actor}</p> */}
                                <ObjectContentDisplay objectUrl={activity.object} />
                            </li>
                        ))}
                    </ul>
                    <div className='col-span-2 rounded-xl bg-grey-50 p-5'>
                        <Heading className='mb-3' level={5}>Following</Heading>
                        <ul>
                            <li className='mb-4'>
                                <span className='mb-2 text-md font-medium text-grey-800'>@fakeuser@fakehost</span>
                            </li>
                            <li className='mb-4'>
                                <span className='mb-2 text-md font-medium text-grey-800'>@fakeuser@fakehost</span>
                            </li>
                            <li className='mb-4'>
                                <span className='mb-2 text-md font-medium text-grey-800'>@fakeuser@fakehost</span>
                            </li>
                            <li className='mb-4'>
                                <span className='mb-2 text-md font-medium text-grey-800'>@fakeuser@fakehost</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </ViewContainer>
        </Page>
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
                // console.error('Error fetching object content:', error);
            }
        };

        fetchObjectContent();

        // Clean up function if needed
        return () => {
            // Any clean-up code here
        };
    }, [objectUrl]);

    const parser = new DOMParser();
    const doc = parser.parseFromString(objectContent?.content || '', 'text/html');

    const plainTextContent = doc.body.textContent;

    return (
        <>
            {objectContent && (
                <a className='border-1 group/article flex flex-col items-start justify-between border-b border-b-grey-200 py-5' href={`${objectContent.url}`} rel="noopener noreferrer" target="_blank">
                    {/* <p className='mb-2 text-grey-700'>Object Type: {objectContent.type}</p> */}
                    <div className='flex w-full justify-between gap-4'>
                        <Heading className='mb-2' level={5}>{objectContent.name}</Heading>
                        <Icon className='mb-2 opacity-0 transition-opacity group-hover/article:opacity-100' colorClass='text-grey-500' name='arrow-top-right' size='sm' />
                    </div>
                    <p className='mb-6 line-clamp-2 max-w-prose text-md text-grey-800'>{plainTextContent}</p>
                    {/* <p className='mb-2 text-grey-950'>{objectContent.url}</p> */}
                    <p className='text-md font-medium text-grey-800'>@fakeuser@fakehost</p>
                </a>
            )}
        </>
    );
};

export default ActivityPubComponent;
