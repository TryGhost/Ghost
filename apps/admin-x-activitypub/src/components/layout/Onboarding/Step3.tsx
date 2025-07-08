import Header from './components/Header';
import React, {ReactNode, useEffect, useState} from 'react';
import caseyAvatar from '@assets/images/onboarding/avatar-casey.png';
import creatorScienceAvatar from '@assets/images/onboarding/avatar-creator-science.png';
import creatorScienceCover from '@assets/images/onboarding/cover-creator-science.png';
import evanAvatar from '@assets/images/onboarding/avatar-evan.png';
import flipboardAvatar from '@assets/images/onboarding/avatar-flipboard.png';
import fourOFourAvatar from '@assets/images/onboarding/avatar-404.png';
import goneAvatar from '@assets/images/onboarding/avatar-gone.png';
import goneCover from '@assets/images/onboarding/cover-gone.png';
import leverAvatar from '@assets/images/onboarding/avatar-lever.png';
import leverCover from '@assets/images/onboarding/cover-lever.png';
import platformerAvatar from '@assets/images/onboarding/avatar-platformer.png';
import platformerCover from '@assets/images/onboarding/cover-platformer.png';
import readerCover from '@assets/images/onboarding/cover-reader.png';
import tangleAvatar from '@assets/images/onboarding/avatar-tangle.png';
import tangleCover from '@assets/images/onboarding/cover-tangle.png';
import {Avatar, AvatarFallback, AvatarImage, Button, H1, LucideIcon, Separator} from '@tryghost/shade';
import {useAccountForUser} from '@src/hooks/use-activity-pub-queries';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useOnboardingStatus} from './Onboarding';

const MenuItem: React.FC<{
    children?: ReactNode,
    selected?: boolean
}> = ({children, selected}) => {
    return (
        <div className={`flex h-[30px] items-center gap-1.5 rounded-sm px-2 text-sm font-medium  ${selected ? 'bg-gray-100 text-black' : 'text-gray-700'}`}>
            {children}
        </div>
    );
};

const TabButton: React.FC<{
    children?: ReactNode,
    selected?: boolean,
    onClick?: () => void,
    onMouseEnter?: () => void,
    onMouseLeave?: () => void
}> = ({children, selected, onClick, onMouseEnter, onMouseLeave}) => {
    return (
        <Button
            className={`h-auto rounded-full px-3 py-0.5 font-mono text-sm font-medium uppercase tracking-wide ${!selected && 'bg-transparent text-gray-700'}`}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </Button>
    );
};

const Sidebar: React.FC<{selectedTab?: number}> = ({selectedTab}) => {
    return (
        <div className='flex h-full flex-col gap-px border-l border-gray-200 pl-4 pt-4 dark:border-gray-900'>
            <MenuItem selected={selectedTab === 1}>
                <LucideIcon.Inbox size={16} strokeWidth={1.5} /> Inbox
            </MenuItem>
            <MenuItem selected={selectedTab === 2}>
                <LucideIcon.Hash size={16} strokeWidth={1.5} /> Feed
            </MenuItem>
            <MenuItem>
                <LucideIcon.Bell size={16} strokeWidth={1.5} /> Notifications
            </MenuItem>
            <MenuItem>
                <LucideIcon.Globe size={16} strokeWidth={1.5} /> Explore
            </MenuItem>
            <MenuItem>
                <LucideIcon.User size={16} strokeWidth={1.5} /> Profile
            </MenuItem>
            <div className='mt-8'>
                <div className='inline-flex h-8 items-center gap-1.5 rounded-full bg-purple-500 pl-2 pr-3 text-sm font-medium text-white'>
                    <LucideIcon.FilePen size={16} strokeWidth={1.5} /> New note
                </div>
            </div>
        </div>
    );
};

const LongFormContent: React.FC = () => {
    const inboxList = [
        {
            avatar: tangleAvatar,
            publisher: 'Tangle',
            title: 'The Sunday — February 23',
            excerpt: 'This is the Tangle Sunday Edition, a brief roundup of our independent politics coverage plus some extra features for your Sunday morning reading.',
            cover: tangleCover
        },
        {
            avatar: creatorScienceAvatar,
            publisher: 'Creator Science',
            title: `A lesson from basketball's 3-point line`,
            excerpt: `The NBA was formed in 1949 after the merger of the National Basketball League (founded in 1937) and the
            Basketball Association of America (founded in 1946).`,
            cover: creatorScienceCover
        },
        {
            avatar: goneAvatar,
            publisher: 'Gone with the Wynns',
            title: 'How far can our electric boat go?',
            excerpt: `Does an electric tender actually have the stamina needed to work for cruising life?  Until now, we honestly didn't know how long or far we could go with our electric jet propulsion. I guess we just haven't been...`,
            cover: goneCover
        },
        {
            avatar: platformerAvatar,
            publisher: 'Platformer',
            title: 'Manus of the hour',
            excerpt: 'What the hype cycle around a new Chinese AI model tells us about the state of competition in agents',
            cover: platformerCover
        },
        {
            avatar: leverAvatar,
            publisher: 'The Lever',
            title: 'Is It Still Safe To Fly?',
            excerpt: `Aviation and antitrust expert Bill McGee breaks down recent airplane disasters and reveals the real risks to our airspace.`,
            cover: leverCover
        }
    ];

    return (
        <>
            <div className='flex w-full justify-between border-b border-gray-200 py-5 dark:border-gray-900'>
                <H1>Inbox</H1>
                <div className='flex h-[30px] w-[232px] items-center rounded-full bg-gray-100 px-2 text-gray-400 dark:bg-gray-950'>
                    <LucideIcon.Search size={16} strokeWidth={1.5} />
                </div>
            </div>
            <div className='grid h-full grid-cols-[auto_248px] gap-4'>
                <div>
                    {inboxList.map(item => (
                        <div key={item.publisher} className='flex items-center justify-between gap-8 border-b border-gray-200 py-4 dark:border-gray-900'>
                            <div className='flex flex-col gap-1'>
                                <div className='flex items-center gap-1.5 text-sm font-semibold'>
                                    <div className='h-4 w-4 rounded-full bg-cover bg-center bg-no-repeat' style={{
                                        backgroundImage: `url(${item.avatar})`
                                    }}></div>
                                    {item.publisher}
                                </div>
                                <div className='font-semibold'>
                                    {item.title}
                                </div>
                                <div className='text-sm text-gray-600'>
                                    {item.excerpt}
                                </div>
                            </div>
                            <div>
                                <div className='h-20 w-[120px] min-w-[120px] rounded-sm bg-cover bg-center bg-no-repeat'style={{
                                    backgroundImage: `url(${item.cover})`
                                }}></div>
                            </div>
                        </div>
                    ))}
                </div>
                <Sidebar selectedTab={1} />
            </div>
        </>
    );
};

const ShortFormContent: React.FC = () => {
    const feedList = [
        {
            avatar: flipboardAvatar,
            publisher: 'Flibboard',
            handle: '@flipboard@flipboard.social — 17m',
            post: (
                <div>
                    <span className='text-purple'>@newyorktimes&apos;s</span> veteran tech reporter <span className='text-purple'>@Markoff</span> interviewed some of <span className='text-purple'>#TeamFediverse</span> including our CEO <span className='text-purple'>@mike</span> for a feature on the rise of decentralized social media. &quot;It goes back to the original principles... <span className='text-purple'>Show more</span>
                </div>
            ),
            likes: 94,
            replies: 12,
            reposts: 71,
            liked: false
        },
        {
            avatar: caseyAvatar,
            publisher: 'Casey Newton',
            handle: `@caseynewton@mastodon.social — 2h`,
            post: (
                <div>
                    This sucks. I met my wife on the basic HTML version of Gmail. <span className='text-purple'>techmeme.com/23092...</span>
                </div>
            ),
            likes: 118,
            replies: 32,
            reposts: 27,
            liked: true
        },
        {
            avatar: evanAvatar,
            publisher: 'Evan Prodromou',
            handle: '@evan@cosocial.ca — 2h',
            post: (
                <div>
                    At #FediverseHouse, after <span className='text-purple'>@pluralistic</span>&apos;s talk, I came up and thanked him for speaking. We&apos;ve never met before in person, so I asked if we could do a selfie.
                </div>
            ),
            likes: 44,
            replies: 20,
            reposts: 14,
            liked: true
        }
    ];

    const {data: account} = useAccountForUser('index', 'me');

    return (
        <>
            <div className='flex w-full justify-between border-b border-gray-200 py-5 dark:border-gray-900'>
                <H1>Feed</H1>
                <div className='flex h-[30px] w-[232px] items-center rounded-full bg-gray-100 px-2 text-gray-400 dark:bg-gray-950'>
                    <LucideIcon.Search size={16} strokeWidth={1.5} />
                </div>
            </div>
            <div className='grid h-full grid-cols-[auto_248px] gap-4'>
                <div className='mx-auto flex w-full max-w-[524px] flex-col items-center gap-4 pt-8'>
                    <div className='mb-5 flex w-full items-center gap-3 rounded-md bg-white p-3 text-gray-600 shadow-sm dark:bg-gray-950'>
                        <Avatar className='h-9 w-9'>
                            <AvatarImage src={account?.avatarUrl} />
                            <AvatarFallback><LucideIcon.User strokeWidth={1.5} /></AvatarFallback>
                        </Avatar>
                        What&apos;s new?
                    </div>
                    {feedList.map(item => (
                        <>
                            <div className='flex w-full items-start gap-3 px-3'>
                                <div className='h-9 max-h-9 min-h-9 w-9 min-w-9 max-w-9 rounded-full bg-cover bg-center bg-no-repeat'
                                    style={{
                                        backgroundImage: `url(${item.avatar})`
                                    }}></div>
                                <div className='flex flex-col gap-3 text-sm'>
                                    <div className='mt-0.5 flex flex-col gap-0.5'>
                                        <div className='font-semibold leading-tighter'>{item.publisher}</div>
                                        <div className='leading-tighter text-gray-700'>{item.handle}</div>
                                    </div>
                                    <div>
                                        {item.post}
                                    </div>
                                    <div className='flex items-center gap-3 text-xs font-medium'>
                                        <div className={`flex items-center gap-1 ${item.liked && 'text-pink-500'}`}>
                                            <LucideIcon.Heart size={14} strokeWidth={1.5} />
                                            {item.likes}
                                        </div>
                                        <div className='flex items-center gap-1'>
                                            <LucideIcon.Reply size={14} strokeWidth={1.5} />
                                            {item.likes}
                                        </div>
                                        <div className='flex items-center gap-1'>
                                            <LucideIcon.Repeat size={14} strokeWidth={1.5} />
                                            {item.likes}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Separator />
                        </>
                    ))}
                </div>
                <Sidebar selectedTab={2} />
            </div>
        </>
    );
};

const Reader: React.FC = () => {
    return (
        <>
            <div className='relative flex w-full items-center justify-center border-b border-gray-200 py-5 dark:border-gray-900'>
                <div className='flex w-full max-w-[520px] items-center gap-3 text-sm'>
                    <div className='h-9 max-h-9 min-h-9 w-9 min-w-9 max-w-9 rounded-full bg-cover bg-center bg-no-repeat'
                        style={{
                            backgroundImage: `url(${fourOFourAvatar})`
                        }}></div>
                    <div className='mt-0.5 flex flex-col gap-0.5'>
                        <div className='font-semibold leading-tighter'>404 Media</div>
                        <div className='leading-tighter text-gray-700'>@index@404media.co — Yesterday</div>
                    </div>
                </div>
                <div className='absolute right-0 flex items-center gap-4 text-gray-500'>
                    <LucideIcon.ALargeSmall size={28} strokeWidth={1} />
                    <LucideIcon.X size={22} strokeWidth={1.15} />
                </div>
            </div>
            <div className='mt-8 flex w-full flex-col items-center'>
                <div className='flex w-full max-w-[610px] flex-col gap-5'>
                    <H1 className='mx-auto max-w-[520px]'>Decentralized Social Media Is the Only Alternative to the Tech Oligarchy</H1>
                    <div className='h-[320px] w-full bg-cover bg-center bg-no-repeat'
                        style={{
                            backgroundImage: `url(${readerCover})`
                        }}></div>
                    <div className='mx-auto max-w-[520px] font-serif text-lg'>The TikTok ban and Donald Trump&apos;s rise to power show how fragile our social media accounts are. We must normalize and invest in decentralized social media.</div>
                    <div className='mx-auto max-w-[520px] font-serif'>If it wasn’t already obvious, the last 72 hours have made it crystal clear that it is urgent to build and mainstream alternative, decentralized social media platforms that are resistant to government censorship and control, are not owned by oligarchs and dominated by their algorithms, and in which users own their follower list and can port it elsewhere easily and without restriction.</div>
                </div>
            </div>
        </>
    );
};

const Step3: React.FC = () => {
    const [activeTab, setActiveTab] = useState(1);
    const [isHovering, setIsHovering] = useState(false);
    const {setOnboarded} = useOnboardingStatus();
    const navigate = useNavigate();

    useEffect(() => {
        if (isHovering) {
            return;
        }

        const interval = setInterval(() => {
            setActiveTab(current => (current === 3 ? 1 : current + 1));
        }, 3000);

        return () => clearInterval(interval);
    }, [isHovering]);

    const handleComplete = async () => {
        await setOnboarded(true);
        navigate('/explore');
    };

    return (
        <div className='flex h-full max-h-screen w-full flex-col gap-4 overflow-hidden px-14'>
            <Header>
                <div className='flex flex-col justify-between gap-4 text-xl font-medium'>
                    <h1 className='max-w-[680px]'>Find inspiration & follow what you love.</h1>
                    <div className='flex max-w-[680px] flex-col gap-4'>
                        <p className='tracking-tight text-gray-700 dark:text-gray-600'>Follow-back your community to connect with them directly, or subscribe to your peers for inspiration to fuel your next idea. You now have a native <span className='font-semibold text-black'>social web reader</span> inside Ghost for keeping track of your favourite creators across different platforms.</p>
                    </div>
                </div>
                <Button className='min-w-60 bg-gradient-to-r from-purple-500 to-[#6A1AD6] hover:opacity-90 dark:text-white' size='lg' onClick={handleComplete}>Next &rarr;</Button>
            </Header>
            <div className='mt-8 flex h-full max-h-[760px] flex-col items-stretch justify-end'>
                <div
                    className='flex items-center justify-center gap-2'
                    onMouseEnter={() => {
                        setIsHovering(true);
                    }}
                    onMouseLeave={() => {
                        setIsHovering(false);
                    }}
                >
                    <TabButton
                        selected={activeTab === 1}
                        onClick={() => {
                            setActiveTab(1);
                        }}
                    >
                        Long form content
                    </TabButton>
                    <TabButton
                        selected={activeTab === 2}
                        onClick={() => {
                            setActiveTab(2);
                        }}
                    >
                        Short form content
                    </TabButton>
                    <TabButton
                        selected={activeTab === 3}
                        onClick={() => {
                            setActiveTab(3);
                        }}
                    >
                        Integrated reader
                    </TabButton>
                </div>
                <div className='pointer-events-none relative -mx-14 mt-5 w-[calc(100%+112px)] overflow-y-hidden px-14'>
                    <div className='mx-auto h-[694px] w-full max-w-6xl overflow-hidden rounded-md bg-white shadow-xl dark:bg-[#101114]'>
                        <div className='flex h-5 w-full items-center gap-1.5 bg-gray-100 pl-2 dark:bg-gray-950'>
                            <div className='h-2 w-2 rounded-full bg-gray-300'></div>
                            <div className='h-2 w-2 rounded-full bg-gray-300'></div>
                            <div className='h-2 w-2 rounded-full bg-gray-300'></div>
                        </div>
                        <div className='h-full px-8'>
                            {activeTab === 1 && <LongFormContent />}
                            {activeTab === 2 && <ShortFormContent />}
                            {activeTab === 3 && <Reader />}
                        </div>
                    </div>
                    <div className='absolute inset-x-0 bottom-0 h-18 bg-gradient-to-t from-white via-[rgba(255,255,255,0.71)] to-[rgba(255,255,255,0)] dark:from-black dark:via-[rgba(0,0,0,0.71)] dark:to-[rgba(0,0,0,0)]'></div>
                </div>
            </div>
        </div>
    );
};

export default Step3;
