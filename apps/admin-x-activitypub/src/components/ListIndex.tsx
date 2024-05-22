// import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import {Button, Heading, Page, ViewContainer} from '@tryghost/admin-x-design-system';
import {SiteData, useBrowseSite} from '@tryghost/admin-x-framework/api/site';
// import {formatRelativeTime} from '../utils/helpers';
// import ViewArticle from './ViewArticle';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface Activity {
    id: string;
    type: string;
    summary: string;
    actor: object;
    object: {
        type: 'Article' | 'Link';
    };
    siteData: SiteData;
}

export type Following = {
    id: string;
    username?: string;
}

// interface ObjectContent {
//   type: string;
//   name: string;
//   content: string;
//   url: string;
// }

interface ViewArticleProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object: any,
    onBackToList: () => void;
}

const ActivityPubComponent: React.FC = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [following, setFollowing] = useState<Following[]>([]);
    const [followingCount, setFollowingCount] = useState<number>(0); // New state variable
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const {updateRoute} = useRouting();

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const response = await fetch(`${siteData?.url.replace(/\/$/, '')}/activitypub/inbox/deadbeefdeadbeefdeadbeef`);
                // const response = await fetch(`https://1357-2a01-11-8210-4b10-885-f591-83c8-1a78.ngrok-free.app/activitypub/outbox/deadbeefdeadbeefdeadbeef`);
                // console.log('Fetching activities from:', 'https://1357-2a01-11-8210-4b10-885-f591-83c8-1a78.ngrok-free.app/activitypub/outbox/deadbeefdeadbeefdeadbeef');
                // console.log('Fetching activities from:', siteData?.url.replace(/\/$/, '') + '/activitypub/inbox/deadbeefdeadbeefdeadbeef');

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

        if (siteData?.url) {
            fetchActivities();
        }

        // Clean up function if needed
        return () => {
            // Any clean-up code here
        };
    }, [siteData?.url]);

    useEffect(() => {
        const fetchFollowing = async () => {
            try {
                const response = await fetch(`${siteData?.url.replace(/\/$/, '')}/activitypub/following/deadbeefdeadbeefdeadbeef`);
                // console.log('Fetching following from:', siteData?.url.replace(/\/$/, '') + '/activitypub/following/deadbeefdeadbeefdeadbeef');

                if (response.ok) {
                    const data = await response.json();
                    setFollowing(data.items);
                    setFollowingCount(data.totalItems); // Update following count
                } else {
                    throw new Error('Failed to fetch following');
                }
            } catch (error) {
                // console.error('Error fetching activities:', error);
            }
        };

        if (siteData?.url) {
            fetchFollowing();
        }

        // Clean up function if needed
        return () => {
            // Any clean-up code here
        };
    }, [siteData?.url]);

    const [articleContent, setArticleContent] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleViewContent = (content: any) => {
        setArticleContent(content);
    };

    const handleBackToList = () => {
        setArticleContent(null);
    };

    return (
        <Page>
            {!articleContent ? (
                <ViewContainer
                // actions={dummyActions}
                    primaryAction={{
                        title: 'Follow',
                        onClick: () => {
                            updateRoute('follow-site');
                        },
                        icon: 'add'
                    }}
                    title='ActivityPub Inbox'
                    toolbarBorder={false}
                    type='page'
                >
                    <div className='grid grid-cols-6 items-start gap-8'>
                        <ul className='col-span-4 flex flex-col'>
                            {activities.slice().reverse().map(activity => (
                                activity.type === 'Create' && activity.object.type === 'Article' ?
                                    <li key={activity.id} data-test-view-article onClick={() => handleViewContent(activity.object)}>
                                        <ObjectContentDisplay actor={activity.actor} object={activity.object}/>
                                    </li>
                                    : null
                            ))}
                        </ul>
                        <div className='col-span-2 rounded-xl bg-grey-50 p-5'>
                            <ul data-test-following>
                                {following.slice().map(({username}) => {
                                    return (<li className='mb-4'>
                                        <span className='mb-2 text-md font-medium text-grey-800'>{username}</span>
                                    </li>);
                                })}
                            </ul>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='group/stat mb-5 flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/view-following')}>
                                    <span className='text-3xl font-bold leading-none' data-test-following-count>{followingCount}</span>
                                    <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900' data-test-following-modal>Following<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
                                </div>
                                {/* <div className='group/stat mb-5 flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/view-following')}>
                                    <span className='text-3xl font-bold leading-none'>12</span>
                                    <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900'>Followers<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
                                </div> */}
                            </div>
                        </div>
                    </div>
                </ViewContainer>

            ) : (
                <ViewArticle object={articleContent} onBackToList={handleBackToList} />
            )}

        </Page>
    );
};

const ArticleBody: React.FC<{html: string}> = ({html}) => {
    // const dangerouslySetInnerHTML = {__html: html};
    // const cssFile = '../index.css';
    const site = useBrowseSite();
    const siteData = site.data?.site;

    const cssContent = `<style>
    
  </style><link rel="stylesheet" type="text/css" href="${siteData?.url.replace(/\/$/, '')}/assets/styles/reader.css" />`;

    const htmlContent = `
  <html>
  <head>
      ${cssContent}
  </head>
  <body>
      ${html}
  </body>
  </html>
`;

    return (
        <iframe
            height="100%"
            srcDoc={htmlContent}
            title="Embedded Content"
            width="100%"
        >
            {/* <div className="mt gh-whats-new mb-2 flex flex-row items-center gap-4 pr-4">
                <div className='gh-wn-entry'>
                    <div dangerouslySetInnerHTML={dangerouslySetInnerHTML} className="gh-comment-content text-neutral-900 font-sans text-[16px] leading-normal [overflow-wrap:anywhere] dark:text-[rgba(255,255,255,0.85)]" data-testid="comment-content"/>
                </div>
            </div> */}
        </iframe>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ObjectContentDisplay: React.FC<{actor: any, object: any }> = ({actor, object}) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(object.content || '', 'text/html');

    const plainTextContent = doc.body.textContent;
    // const timestamp = new Date(object.published).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'});
    const timestamp =
        new Date(object.published).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'}) + ', ' + new Date(object.published).toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'});

    // const timestamp = formatRelativeTime(new Date(object.published));

    return (
        <>
            {object && (
                <div className='border-1 group/article flex cursor-pointer flex-col items-start justify-between border-b border-b-grey-200 py-5' data-test-activity>
                    <div className='mb-3 flex w-full items-center gap-2'>
                        <img className='w-5' src='https://www.platformer.news/content/images/size/w256h256/2024/05/Logomark_Blue_800px.png'/>
                        <span className='text-base font-semibold'>{actor.name}</span>
                        <span className='ml-auto text-md text-grey-800'>{getUsername(actor)}</span>
                    </div>
                    <div className='grid w-full grid-cols-[auto_170px]'>
                        <div className='flex flex-col'>
                            <div className='flex w-full justify-between gap-4'>
                                <Heading className='mb-2' level={5} data-test-activity-heading>{object.name}</Heading>
                            </div>
                            <p className='mb-6 line-clamp-2 max-w-prose text-md text-grey-800'>{plainTextContent}</p>
                            <p className='mt-auto text-md text-grey-800'>{timestamp}</p>
                        </div>
                        <div>
                            <img className='h-[120px] rounded object-cover' src={object.image}/>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const ViewArticle: React.FC<ViewArticleProps> = ({object, onBackToList}) => {
    const {updateRoute} = useRouting();

    // console.log('Object: ', object);

    return (
        <Page>
            <ViewContainer
                toolbarBorder={false}
                type='page'
            >
                <div className='grid grid-cols-[1fr_minmax(320px,_600px)_1fr] gap-x-6 gap-y-12'>
                    <div>
                        <Button icon='chevron-left' iconSize='xs' label='Inbox' data-test-back-button onClick={onBackToList}/>
                    </div>
                    <div className='flex items-center'>
                        <img src=''/>
                        <span className='text-base font-semibold'>Platformer</span>
                    </div>
                    <div className='flex justify-end'>
                        <Button icon='arrow-top-right' iconSize='xs' label='Visit site' onClick={() => updateRoute('/')}/>
                    </div>
                    <div className='col-start-2 text-xl'>
                        <Heading className='mb-3' level={1} data-test-article-heading>{object.name}</Heading>
                        <ArticleBody html={object.content}/>
                    </div>
                </div>
            </ViewContainer>
        </Page>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUsername(actor: any) {
    if (!actor.preferredUsername || !actor.id) {
        return '@unknown@unknown';
    }
    try {
        return `@${actor.preferredUsername}@${(new URL(actor.id)).hostname}`;
    } catch (err) {
        return '@unknown@unknown';
    }
}

export default ActivityPubComponent;
