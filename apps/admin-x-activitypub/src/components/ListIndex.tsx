import ActivityPubWelcomeImage from '../assets/images/ap-welcome.png';
import React, {useEffect, useRef, useState} from 'react';
import articleBodyStyles from './articleBodyStyles';
import getUsername from '../utils/get-username';
import {ActivityPubAPI} from '../api/activitypub';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Avatar, Button, ButtonGroup, Heading, Icon, List, ListItem, Page, SelectOption, SettingValue, ViewContainer, ViewTab} from '@tryghost/admin-x-design-system';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useQuery} from '@tanstack/react-query';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface ViewArticleProps {
    object: ObjectProperties,
    onBackToList: () => void;
}

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

function useFollowersCountForUser(handle: string) {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const siteUrl = siteData?.url ?? window.location.origin;
    const api = new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
    return useQuery({
        queryKey: [`followersCount:${handle}`],
        async queryFn() {
            return api.getFollowersCount();
        }
    });
}

function useFollowingCountForUser(handle: string) {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const siteUrl = siteData?.url ?? window.location.origin;
    const api = new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
    return useQuery({
        queryKey: [`followingCount:${handle}`],
        async queryFn() {
            return api.getFollowingCount();
        }
    });
}

const ActivityPubComponent: React.FC = () => {
    const {updateRoute} = useRouting();

    // TODO: Replace with actual user ID
    const {data: activities = []} = useBrowseInboxForUser('index');
    const {data: followersCount = 0} = useFollowersCountForUser('index');
    const {data: followingCount = 0} = useFollowingCountForUser('index');

    const [articleContent, setArticleContent] = useState<ObjectProperties | null>(null);
    const [, setArticleActor] = useState<ActorProperties | null>(null);

    const handleViewContent = (object: ObjectProperties, actor: ActorProperties) => {
        setArticleContent(object);
        setArticleActor(actor);
    };

    const handleBackToList = () => {
        setArticleContent(null);
    };

    const [selectedOption, setSelectedOption] = useState<SelectOption>({label: 'Feed', value: 'feed'});

    const [selectedTab, setSelectedTab] = useState('inbox');

    const inboxTabActivities = activities.filter((activity: Activity) => {
        const isCreate = activity.type === 'Create' && ['Article', 'Note'].includes(activity.object.type);
        const isAnnounce = activity.type === 'Announce' && activity.object.type === 'Note';

        return isCreate || isAnnounce;
    });
    const activityTabActivities = activities.filter((activity: Activity) => activity.type === 'Create' && activity.object.type === 'Article');
    const likeTabActivies = activities.filter((activity: Activity) => activity.type === 'Like');

    const tabs: ViewTab[] = [
        {
            id: 'inbox',
            title: 'Inbox',
            contents: (
                <div className='w-full'>
                    {inboxTabActivities.length > 0 ? (
                        <ul className='mx-auto flex max-w-[540px] flex-col py-8'>
                            {inboxTabActivities.reverse().map(activity => (
                                <li
                                    key={activity.id}
                                    data-test-view-article
                                    onClick={() => handleViewContent(activity.object, activity.actor)}
                                >
                                    <ObjectContentDisplay
                                        actor={activity.actor}
                                        layout={selectedOption.value}
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
            )
        },
        {
            id: 'activity',
            title: 'Activity',
            contents: (
                <div className='grid grid-cols-6 items-start gap-8 pt-8'>
                    <ul className='order-2 col-span-6 flex flex-col lg:order-1 lg:col-span-4'>
                        {activityTabActivities.reverse().map(activity => (
                            <li
                                key={activity.id}
                                data-test-view-article
                                onClick={() => handleViewContent(activity.object, activity.actor)}
                            >
                                <ObjectContentDisplay
                                    actor={activity.actor}
                                    layout={selectedOption.value}
                                    object={activity.object}
                                    type={activity.object.type}
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            )
        },
        {
            id: 'likes',
            title: 'Likes',
            contents: (
                <div className='grid grid-cols-6 items-start gap-8 pt-8'>
                    <List className='col-span-4'>
                        {likeTabActivies.reverse().map(activity => (
                            <ListItem
                                avatar={<Avatar image={activity.actor.icon?.url} size='sm' />}
                                id='list-item'
                                title={
                                    <div>
                                        <span className='font-medium'>{activity.actor.name}</span>
                                        <span className='text-grey-800'> liked your post </span>
                                        <span className='font-medium'>{activity.object.name}</span>
                                    </div>
                                }
                            />
                        ))}
                    </List>
                </div>
            )
        },
        {
            id: 'profile',
            title: 'Profile',
            contents: (
                <div>
                    <div className='rounded-xl bg-grey-50 p-6' id="ap-sidebar">
                        <div className='mb-4 border-b border-b-grey-200 pb-4'><SettingValue key={'your-username'} heading={'Your username'} value={'@index@localplaceholder.com'}/></div>
                        <div className='grid grid-cols-2 gap-4'>
                            <div className='group/stat flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/view-following')}>
                                <span className='text-3xl font-bold leading-none' data-test-following-count>{followingCount}</span>
                                <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900' data-test-following-modal>Following<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
                            </div>
                            <div className='group/stat flex cursor-pointer flex-col gap-1' onClick={() => updateRoute('/view-followers')}>
                                <span className='text-3xl font-bold leading-none' data-test-following-count>{followersCount}</span>
                                <span className='text-base leading-none text-grey-800 group-hover/stat:text-grey-900' data-test-followers-modal>Followers<span className='ml-1 opacity-0 transition-opacity group-hover/stat:opacity-100'>&rarr;</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    return (
        <Page>
            {!articleContent ? (
                <ViewContainer
                    actions={[<ButtonGroup buttons={[
                        {
                            icon: 'listview',
                            size: 'sm',
                            iconColorClass: selectedOption.value === 'feed' ? 'text-black' : 'text-grey-500',
                            onClick: () => {
                                setSelectedOption({label: 'Feed', value: 'feed'});
                            }

                        },
                        {
                            icon: 'cardview',
                            size: 'sm',
                            iconColorClass: selectedOption.value === 'inbox' ? 'text-black' : 'text-grey-500',
                            onClick: () => {
                                setSelectedOption({label: 'Inbox', value: 'inbox'});
                            }
                        }
                    ]} clearBg={true} link outlineOnMobile />]}
                    firstOnPage={true}
                    primaryAction={{
                        title: 'Follow',
                        onClick: () => {
                            updateRoute('follow-site');
                        },
                        icon: 'add'
                    }}
                    selectedTab={selectedTab}
                    stickyHeader={true}
                    tabs={tabs}
                    title='ActivityPub'
                    toolbarBorder={true}
                    type='page'
                    onTabChange={setSelectedTab}
                >
                </ViewContainer>

            ) : (
                <ViewArticle object={articleContent} onBackToList={handleBackToList} />
            )}

        </Page>
    );
};

const ArticleBody: React.FC<{heading: string, image: string|undefined, html: string}> = ({heading, image, html}) => {
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
                height="100%"
                id="gh-ap-article-iframe"
                title="Embedded Content"
                width="100%"
            >
            </iframe>
        </div>
    );
};

const ObjectContentDisplay: React.FC<{actor: ActorProperties, object: ObjectProperties, layout: string, type: string }> = ({actor, object, layout, type}) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(object.content || '', 'text/html');

    const plainTextContent = doc.body.textContent;
    let previewContent = '';
    if (object.preview) {
        const previewDoc = parser.parseFromString(object.preview.content || '', 'text/html');
        previewContent = previewDoc.body.textContent || '';
    } else if (object.type === 'Note') {
        previewContent = plainTextContent || '';
    }

    const renderAttachment = () => {
        let attachment;
        if (object.image) {
            attachment = object.image;
        }

        if (object.type === 'Note' && !attachment) {
            attachment = object.attachment;
        }

        // const attachment = object.attachment;
        if (!attachment) {
            return null;
        }

        if (Array.isArray(attachment)) {
            return (
                <div className="attachment-gallery mt-2 grid auto-rows-[150px] grid-cols-2 gap-2">
                    {attachment.map((item, index) => (
                        <img key={item.url} alt={`attachment-${index}`} className='h-full w-full rounded-md object-cover' src={item.url} />
                    ))}
                </div>
            );
        }

        switch (attachment.mediaType) {
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
            return <img alt="attachment" className='mt-2 rounded-md outline outline-1 -outline-offset-1 outline-black/10' src={attachment.url} />;
        case 'video/mp4':
        case 'video/webm':
            return <div className='relative mb-4 mt-2'>
                <video className='h-[300px] w-full rounded object-cover' src={attachment.url} controls/>
            </div>;

        case 'audio/mpeg':
        case 'audio/ogg':
            return <div className='relative mb-4 mt-2 w-full'>
                <audio className='w-full' src={attachment.url} controls/>
            </div>;
        default:
            return null;
        }
    };

    const timestamp =
        new Date(object?.published ?? new Date()).toLocaleDateString('default', {year: 'numeric', month: 'short', day: '2-digit'}) + ', ' + new Date(object?.published ?? new Date()).toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'});

    const [isClicked, setIsClicked] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    const handleLikeClick = (event: React.MouseEvent<HTMLElement> | undefined) => {
        event?.stopPropagation();
        setIsClicked(true);
        setIsLiked(!isLiked);
        setTimeout(() => setIsClicked(false), 300); // Reset the animation class after 300ms
    };

    let author = actor;
    if (type === 'Announce' && object.type === 'Note') {
        author = typeof object.attributedTo === 'object' ? object.attributedTo as ActorProperties : actor;
    }

    if (layout === 'feed') {
        return (
            <>
                {object && (
                    <div className='group/article relative cursor-pointer pt-4'>
                        {(type === 'Announce' && object.type === 'Note') && <div className='z-10 mb-2 flex items-center gap-4 text-grey-700'>
                            <div className='z-10 flex w-10 justify-end'><Icon colorClass='text-grey-700' name='reload' size={'sm'}></Icon></div>
                            <span className='z-10'>{actor.name} reposted</span>
                        </div>}
                        <div className='flex items-start gap-4'>
                            <img className='z-10 w-10 rounded' src={author.icon?.url}/>
                            <div className='border-1 z-10 -mt-1 flex flex-col items-start justify-between border-b border-b-grey-200 pb-4' data-test-activity>
                                <div className='relative z-10 mb-2 flex w-full flex-col overflow-visible text-[1.5rem]'>
                                    <span className='mr-1 truncate whitespace-nowrap font-bold' data-test-activity-heading>{author.name}</span>
                                    <div className='flex'>
                                        <span className='truncate text-grey-700'>{getUsername(author)}</span>
                                        <span className='whitespace-nowrap text-grey-700 before:mx-1 before:content-["·"]'>{timestamp}</span>
                                    </div>
                                </div>
                                <div className='relative z-10 w-full gap-4'>
                                    <div className='flex flex-col'>
                                        {object.name && <Heading className='mb-1 leading-tight' level={4} data-test-activity-heading>{object.name}</Heading>}
                                        <div dangerouslySetInnerHTML={({__html: object.content})} className='ap-note-content text-pretty text-[1.5rem] text-grey-900'></div>
                                        {/* <p className='text-pretty text-md text-grey-900'>{object.content}</p> */}
                                        {renderAttachment()}
                                        <div className='mt-3 flex gap-2'>
                                            <Button className={`self-start text-grey-500 transition-all hover:text-grey-800 ${isClicked ? 'bump' : ''} ${isLiked ? 'ap-red-heart text-red *:!fill-red hover:text-red' : ''}`} hideLabel={true} icon='heart' id="like" size='md' unstyled={true} onClick={handleLikeClick}/>
                                            <span className={`text-grey-800 ${isLiked ? 'opacity-100' : 'opacity-0'}`}>1</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='absolute -inset-x-3 -inset-y-0 z-0 rounded transition-colors group-hover/article:bg-grey-100'></div>
                    </div>
                )}
            </>
        );
    } else if (layout === 'inbox') {
        return (
            <>
                {object && (
                    <div className='border-1 group/article relative z-10 flex cursor-pointer flex-col items-start justify-between border-b border-b-grey-200 py-5' data-test-activity>
                        <div className='relative z-10 mb-3 grid w-full grid-cols-[20px_auto_1fr_auto] items-center gap-2 text-base'>
                            <img className='w-5' src={actor.icon?.url}/>
                            <span className='truncate font-semibold'>{actor.name}</span>
                            {/* <span className='truncate text-grey-800'>{getUsername(actor)}</span> */}
                            <span className='ml-auto text-right text-grey-800'>{timestamp}</span>
                        </div>
                        <div className='relative z-10 grid w-full grid-cols-[auto_170px] gap-4'>
                            <div className='flex flex-col'>
                                <div className='flex w-full justify-between gap-4'>
                                    <Heading className='mb-1 line-clamp-2 leading-tight' level={5} data-test-activity-heading>{object.name}</Heading>
                                </div>
                                <p className='mb-6 line-clamp-2 max-w-prose text-pretty text-md text-grey-800'>{previewContent}</p>
                                <div className='flex gap-2'>
                                    <Button className={`self-start text-grey-500 transition-all hover:text-grey-800 ${isClicked ? 'bump' : ''} ${isLiked ? 'ap-red-heart text-red *:!fill-red hover:text-red' : ''}`} hideLabel={true} icon='heart' id="like" size='md' unstyled={true} onClick={handleLikeClick}/>
                                    <span className={`text-grey-800 ${isLiked ? 'opacity-100' : 'opacity-0'}`}>1</span>
                                </div>
                            </div>
                            {/* {image && <div className='relative min-w-[33%] grow'>
                                <img className='absolute h-full w-full rounded object-cover' height='140px' src={image} width='170px'/>
                            </div>} */}
                        </div>
                        <div className='absolute -inset-x-3 -inset-y-1 z-0 rounded transition-colors group-hover/article:bg-grey-50'></div>
                        {/* <div className='absolute inset-0 z-0 rounded from-white to-grey-50 transition-colors group-hover/article:bg-gradient-to-r'></div> */}
                    </div>
                )}
            </>
        );
    }
};

const ViewArticle: React.FC<ViewArticleProps> = ({object, onBackToList}) => {
    const {updateRoute} = useRouting();

    const [isClicked, setIsClicked] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    const handleLikeClick = (event: React.MouseEvent<HTMLElement> | undefined) => {
        event?.stopPropagation();
        setIsClicked(true);
        setIsLiked(!isLiked);
        setTimeout(() => setIsClicked(false), 300); // Reset the animation class after 300ms
    };

    return (
        <Page>
            <ViewContainer
                toolbarBorder={false}
                type='page'
            >
                <div className='grid grid-cols-[1fr_minmax(320px,_700px)_1fr] gap-x-6 pb-4'>
                    <div>
                        <Button icon='chevron-left' iconSize='xs' label='Inbox' data-test-back-button onClick={onBackToList}/>
                    </div>
                    <div className='flex items-center justify-between'>
                    </div>
                    <div className='flex items-center justify-end gap-2'>
                        <div className='flex flex-row-reverse items-center gap-3'>
                            <Button className={`self-start text-grey-500 transition-all hover:text-grey-800 ${isClicked ? 'bump' : ''} ${isLiked ? 'ap-red-heart text-red *:!fill-red hover:text-red' : ''}`} hideLabel={true} icon='heart' id="like" size='md' unstyled={true} onClick={handleLikeClick}/>
                            <span className={`text-grey-800 ${isLiked ? 'opacity-100' : 'opacity-0'}`}>1</span>
                        </div>
                        <Button hideLabel={true} icon='arrow-top-right' iconSize='xs' label='Visit site' onClick={() => updateRoute('/')}/>
                    </div>
                </div>
                <div className='mx-[-4.8rem] mb-[-4.8rem] w-auto'>
                    <ArticleBody heading={object.name} html={object.content} image={object?.image}/>
                </div>
            </ViewContainer>
        </Page>
    );
};

export default ActivityPubComponent;
