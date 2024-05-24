// import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import articleBodyStyles from './articleBodyStyles';
import getUsername from '../utils/get-username';
import {ActorProperties, ObjectProperties, useBrowseFollowingForUser, useBrowseInboxForUser} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, Heading, Page, ViewContainer} from '@tryghost/admin-x-design-system';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface ViewArticleProps {
    object: ObjectProperties,
    onBackToList: () => void;
}

const ActivityPubComponent: React.FC = () => {
    const {updateRoute} = useRouting();

    // TODO: Replace with actual user ID
    const {data: {orderedItems: activities = []} = {}} = useBrowseInboxForUser('deadbeefdeadbeefdeadbeef');
    const {data: {items: following = [], totalItems: followingCount = 0} = {}} = useBrowseFollowingForUser('deadbeefdeadbeefdeadbeef');

    const [articleContent, setArticleContent] = useState<ObjectProperties | null>(null);
    const [, setArticleActor] = useState<ActorProperties | null>(null);

    const handleViewContent = (object: ObjectProperties, actor: ActorProperties) => {
        setArticleContent(object);
        setArticleActor(actor);
    };

    const handleBackToList = () => {
        setArticleContent(null);
    };

    return (
        <Page>
            {!articleContent ? (
                <ViewContainer
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
                            {activities && activities.slice().reverse().map(activity => (
                                activity.type === 'Create' && activity.object.type === 'Article' &&
                                    <li key={activity.id} data-test-view-article onClick={() => handleViewContent(activity.object, activity.actor)}>
                                        <ObjectContentDisplay actor={activity.actor} object={activity.object}/>
                                    </li>
                            ))}
                        </ul>
                        <div className='col-span-2 rounded-xl bg-grey-50 p-5'>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='group/stat mb-5 flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/view-following')}>
                                    <span className='text-3xl font-bold leading-none' data-test-following-count>{followingCount}</span>
                                    <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900' data-test-following-modal>Following<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
                                </div>
                            </div>
                            <ul data-test-following>
                                {following && following.slice().map(({username}) => <li key={username} className='mb-4'>
                                    <span className='mb-2 text-md font-medium text-grey-800'>{username}</span>
                                </li>)}
                            </ul>
                        </div>
                    </div>
                </ViewContainer>

            ) : (
                <ViewArticle object={articleContent} onBackToList={handleBackToList} />
            )}

        </Page>
    );
};

const ArticleBody: React.FC<{heading: string, image: string|undefined, html: string}> = ({heading, image, html}) => {
    // const dangerouslySetInnerHTML = {__html: html};
    // const cssFile = '../index.css';
    const site = useBrowseSite();
    const siteData = site.data?.site;

    const cssContent = articleBodyStyles(siteData?.url.replace(/\/$/, ''));

    const htmlContent = `
  <html>
  <head>
      ${cssContent}
  </head>
  <body>
    <header class="gh-article-header gh-canvas">
        <h1 class="gh-article-title is-title" data-test-article-heading>${heading}</h1>
${image &&
        `<figure class="gh-article-image">
            <img src="${image}" alt="${heading}" />
        </figure>`
}
    </header>
    <div class="gh-content gh-canvas is-body">
      ${html}
    </div>
  </body>
  </html>
`;

    return (
        <iframe
            className='h-[calc(100vh_-_3vmin_-_4.8rem_-_2px)]'
            height="100%"
            id="gh-ap-article-iframe"
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

const ObjectContentDisplay: React.FC<{actor: ActorProperties, object: ObjectProperties }> = ({actor, object}) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(object.content || '', 'text/html');

    const plainTextContent = doc.body.textContent;
    const timestamp =
        new Date(object?.published ?? new Date()).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'}) + ', ' + new Date(object?.published ?? new Date()).toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'});

    return (
        <>
            {object && (
                <div className='border-1 group/article flex cursor-pointer flex-col items-start justify-between border-b border-b-grey-200 py-5' data-test-activity>
                    <div className='mb-3 flex w-full items-center gap-2'>
                        <img className='w-5' src='https://www.platformer.news/content/images/size/w256h256/2024/05/Logomark_Blue_800px.png'/>
                        <span className='line-clamp-1 text-base font-semibold'>{actor.name}</span>
                        <span className='ml-auto line-clamp-1 text-md text-grey-800'>{getUsername(actor)}</span>
                    </div>
                    <div className='grid w-full grid-cols-[auto_170px] gap-4'>
                        <div className='flex flex-col'>
                            <div className='flex w-full justify-between gap-4'>
                                <Heading className='mb-2 line-clamp-2' level={5} data-test-activity-heading>{object.name}</Heading>
                            </div>
                            <p className='mb-6 line-clamp-2 max-w-prose text-md text-grey-800'>{plainTextContent}</p>
                            <p className='mt-auto text-md text-grey-800'>{timestamp}</p>
                        </div>
                        <div className='relative min-w-[33%] grow'>
                            <img className='absolute h-full w-full rounded object-cover' src={object.image}/>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const ViewArticle: React.FC<ViewArticleProps> = ({object, onBackToList}) => {
    const {updateRoute} = useRouting();

    return (
        <Page>
            <ViewContainer
                toolbarBorder={false}
                type='page'
            >
                <div className='grid grid-cols-[1fr_minmax(320px,_600px)_1fr] gap-x-6 pb-4'>
                    <div>
                        <Button icon='chevron-left' iconSize='xs' label='Inbox' data-test-back-button onClick={onBackToList}/>
                    </div>
                    <div className='flex items-center'>
                        <img src=''/>
                        <span className='text-base font-semibold'>Placeholder</span>
                    </div>
                    <div className='flex justify-end'>
                        <Button icon='arrow-top-right' iconSize='xs' label='Visit site' onClick={() => updateRoute('/')}/>
                    </div>
                </div>
                <div className='-mx-[4.8rem] -mb-[4.8rem] w-auto'>
                    {/* <Heading className='mb-3' level={1} data-test-article-heading>{object.name}</Heading> */}
                    <ArticleBody heading={object.name} html={object.content} image={object?.image}/>
                </div>
            </ViewContainer>
        </Page>
    );
};

export default ActivityPubComponent;
