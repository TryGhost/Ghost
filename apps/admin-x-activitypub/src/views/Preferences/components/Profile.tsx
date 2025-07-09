import APAvatar from '@src/components/global/APAvatar';
import DotsPattern from '@assets/images/dots-pattern.png';
import {Account} from '@src/api/activitypub';
import {Button, H2, LucideIcon, Skeleton, ToggleGroup, ToggleGroupItem} from '@tryghost/shade';
import {takeScreenshot} from '@src/utils/screenshot';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useRef, useState} from 'react';

type ProfileProps = {
    account?: Account
    isLoading: boolean
}

type ProfileCardProps = {
    isScreenshot?: boolean
    format?: 'vertical' | 'square'
}

const Profile: React.FC<ProfileProps> = ({account, isLoading}) => {
    const {isEnabled} = useFeatureFlags();
    const {data: siteData} = useBrowseSite();
    const accentColor = siteData?.site?.accent_color;
    const profileCardRef = useRef<HTMLDivElement>(null);
    const [backgroundColor, setBackgroundColor] = useState<'light' | 'dark' | 'accent'>('light');
    const [cardFormat, setCardFormat] = useState<'vertical' | 'square'>('vertical');
    const shareText = `You can now follow ${account?.name} on the social web, on ${account?.handle}`;

    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const getBackgroundColor = () => {
        switch (backgroundColor) {
        case 'light':
            return '#fff';
        case 'dark':
            return '#15171a';
        case 'accent':
            return accentColor || '#15171a';
        default:
            return '#fff';
        }
    };

    const getTextColor = () => {
        switch (backgroundColor) {
        case 'light':
            return '#15171a';
        case 'dark':
            return '#fff';
        case 'accent':
            return '#fff';
        default:
            return '#15171a';
        }
    };

    const getGradient = () => {
        switch (backgroundColor) {
        case 'light':
            return `linear-gradient(to bottom left, #EBEEF0, ${hexToRgba('#EBEEF0', 0)})`;
        case 'dark':
            return `linear-gradient(to bottom left, ${hexToRgba('#1A1E22', 0.6)}, ${hexToRgba('#343C48', 0.6)})`;
        case 'accent':
            return `linear-gradient(to bottom left, ${hexToRgba(accentColor || '#15171a', 0.1)}, ${hexToRgba(accentColor || '#15171a', 0.08)})`;
        default:
            return `linear-gradient(to bottom left, #EBEEF0, ${hexToRgba('#EBEEF0', 0)})`;
        }
    };

    const handleDownload = async () => {
        if (!profileCardRef.current) {
            return;
        }

        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 100);
        });

        await takeScreenshot(profileCardRef.current, {
            filename: `${account?.handle}.png`,
            backgroundColor: 'transparent'
        });
    };

    const ProfileCard: React.FC<ProfileCardProps> = ({isScreenshot = false, format}) => {
        const cardBackgroundColor = getBackgroundColor();
        const textColor = getTextColor();
        const margin = isScreenshot ? 'm-4' : 'm-12';
        const borderClass = isScreenshot ? backgroundColor === 'light' ? 'border border-gray-200' : '' : 'shadow-xl';

        const cardWidth = format === 'square' ? 'w-[392px]' : 'w-[316px]';
        const cardHeight = 'h-[392px]';

        return (
            <div className={`relative z-10 flex flex-col ${margin} ${cardWidth} ${cardHeight} rounded-[32px] ${borderClass} ${format === 'square' ? 'flex flex-col' : ''}`} style={{backgroundColor: cardBackgroundColor}}>
                <div className='relative h-48 p-2'>
                    {account?.bannerImageUrl &&
                        <img
                            alt={account?.name}
                            className='size-full rounded-[26px] rounded-b-none object-cover'
                            referrerPolicy='no-referrer'
                            src={account?.bannerImageUrl}
                        />
                    }
                    <div className='absolute bottom-0 left-1/2 -mb-8 -translate-x-1/2 rounded-full border-8 [&>div]:!size-16 [&_img]:!size-16' style={{borderColor: cardBackgroundColor}}>
                        <APAvatar
                            author={
                                {
                                    icon: {
                                        url: account?.avatarUrl || ''
                                    },
                                    name: account?.name || '',
                                    handle: account?.handle
                                }
                            }
                            size='md'
                        />
                    </div>
                </div>
                <div className={`flex grow flex-col items-center p-6 pt-9 text-center ${format === 'square' ? 'flex-1 justify-center' : ''}`}>
                    <H2 style={{color: textColor}}>{!isLoading ? account?.name : <Skeleton className='w-32' />}</H2>
                    <span className='mt-0.5 text-lg' style={{color: textColor}}>{!isLoading ? 'Now on the Social Web!' : <Skeleton className='w-28' />}</span>
                    <div
                        className='mt-auto min-h-12 w-full truncate rounded-full border px-4 py-3 font-medium'
                        style={{
                            color: backgroundColor === 'accent' ? '#fff' : accentColor,
                            borderColor: accentColor ? hexToRgba(backgroundColor === 'accent' ? '#ffffff' : accentColor, 0.2) : undefined,
                            background: accentColor ? `linear-gradient(to top right, ${hexToRgba(backgroundColor === 'accent' ? '#ffffff' : accentColor, 0.04)}, ${hexToRgba(backgroundColor === 'accent' ? '#ffffff' : accentColor, 0.16)})` : undefined
                        }}
                    >
                        {account?.handle}
                    </div>
                </div>
            </div>
        );
    };

    if (!isEnabled('share')) {
        return (
            <div className='flex flex-col items-center'>
                <APAvatar
                    author={
                        {
                            icon: {
                                url: account?.avatarUrl || ''
                            },
                            name: account?.name || '',
                            handle: account?.handle
                        }
                    }
                    size='lg'
                />
                <H2 className='mb-0.5 mt-4'>{!isLoading ? account?.name : <Skeleton className='w-32' />}</H2>
                <span className='text-[1.5rem] text-gray-700'>{!isLoading ? account?.handle : <Skeleton className='w-full max-w-56' />}</span>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-5'>
            <div className='flex items-center justify-between'>
                <H2>Share your profile</H2>
                <div className='flex gap-4'>
                    <ToggleGroup defaultValue='light' type='single' value={backgroundColor} onValueChange={(value) => {
                        if (value) {
                            setBackgroundColor(value as 'light' | 'dark' | 'accent');
                        }
                    }}>
                        <ToggleGroupItem aria-label='Light' value='light'>
                            <div className='size-4 rounded-full border border-gray-500 dark:border-0 dark:bg-white' />
                        </ToggleGroupItem>
                        <ToggleGroupItem aria-label='Dark' value='dark'>
                            <div className='size-4 rounded-full bg-black dark:border dark:border-gray-700 dark:bg-transparent' />
                        </ToggleGroupItem>
                        <ToggleGroupItem aria-label='Accent color' value='accent'>
                            <div className='size-4 rounded-full' style={{backgroundColor: accentColor}} />
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <ToggleGroup defaultValue='vertical' type='single' value={cardFormat} onValueChange={(value) => {
                        if (value) {
                            setCardFormat(value as 'vertical' | 'square');
                        }
                    }}>
                        <ToggleGroupItem aria-label='Vertical' value='vertical'>
                            <LucideIcon.RectangleVertical className='size-4' />
                        </ToggleGroupItem>
                        <ToggleGroupItem aria-label='Square' value='square'>
                            <LucideIcon.Square className='size-4' />
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>
            <div className='relative flex flex-col items-center overflow-hidden rounded-2xl bg-gray-50'>
                <ProfileCard format={cardFormat} />
                <div className='relative z-10 flex w-full items-center justify-between px-6 pb-6'>
                    <div className='flex items-center gap-2'>
                        <a className='flex h-[34px] w-10 items-center justify-center rounded-sm bg-white px-3 shadow-xs hover:bg-gray-50 [&_svg]:size-4' href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} rel="noopener noreferrer" target='_blank'>
                            <svg aria-hidden="true" viewBox="0 0 24 24"><path className="social-x_svg__x" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                        </a>
                        <a className='flex h-[34px] w-10 items-center justify-center rounded-sm bg-white px-3 shadow-xs hover:bg-gray-50 [&_svg]:size-4' href={`https://threads.net/intent/post?text=${encodeURIComponent(shareText)}`} rel="noopener noreferrer" target='_blank'>
                            <svg fill="none" viewBox="0 0 18 18"><g clipPath="url(#social-threads_svg__clip0_351_18008)"><path d="M13.033 8.38a5.924 5.924 0 00-.223-.102c-.13-2.418-1.452-3.802-3.67-3.816h-.03c-1.327 0-2.43.566-3.11 1.597l1.22.837c.507-.77 1.304-.934 1.89-.934h.02c.73.004 1.282.217 1.639.63.26.302.433.72.519 1.245a9.334 9.334 0 00-2.097-.101c-2.109.121-3.465 1.351-3.374 3.06.047.868.478 1.614 1.216 2.1.624.413 1.428.614 2.263.568 1.103-.06 1.969-.48 2.572-1.25.459-.585.749-1.342.877-2.296.526.317.915.735 1.13 1.236.366.854.387 2.255-.756 3.398-1.003 1.002-2.207 1.435-4.028 1.448-2.02-.015-3.547-.663-4.54-1.925-.93-1.182-1.41-2.89-1.428-5.075.018-2.185.498-3.893 1.428-5.075.993-1.262 2.52-1.91 4.54-1.925 2.034.015 3.588.666 4.62 1.934.505.622.886 1.405 1.137 2.317l1.43-.382c-.305-1.122-.784-2.09-1.436-2.892C13.52 1.35 11.587.517 9.096.5h-.01C6.6.517 4.689 1.354 3.404 2.986 2.262 4.44 1.672 6.46 1.652 8.994v.012c.02 2.534.61 4.555 1.752 6.008C4.69 16.646 6.6 17.483 9.086 17.5h.01c2.21-.015 3.768-.594 5.051-1.876 1.68-1.678 1.629-3.78 1.075-5.07-.397-.927-1.154-1.678-2.189-2.175zm-3.816 3.587c-.924.052-1.884-.363-1.932-1.252-.035-.659.47-1.394 1.99-1.482a8.9 8.9 0 01.512-.014c.552 0 1.068.053 1.538.156-.175 2.187-1.203 2.542-2.108 2.592z" fill="#000"></path></g><defs><clipPath id="social-threads_svg__clip0_351_18008"><path d="M0 0h17v17H0z" fill="#fff" transform="translate(.5 .5)"></path></clipPath></defs></svg>
                        </a>
                        <a className='flex h-[34px] w-10 items-center justify-center rounded-sm bg-white px-3 shadow-xs hover:bg-gray-50 [&_svg]:size-4' href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareText)}`} rel="noopener noreferrer" target='_blank'>
                            <svg fill="none" viewBox="0 0 40 40"><title>social-facebook</title><path className="social-facebook_svg__fb" d="M20 40.004c11.046 0 20-8.955 20-20 0-11.046-8.954-20-20-20s-20 8.954-20 20c0 11.045 8.954 20 20 20z" fill="#1977f3"></path><path d="M27.785 25.785l.886-5.782h-5.546V16.25c0-1.58.773-3.125 3.26-3.125h2.522V8.204s-2.29-.39-4.477-.39c-4.568 0-7.555 2.767-7.555 7.781v4.408h-5.08v5.782h5.08v13.976a20.08 20.08 0 003.125.242c1.063 0 2.107-.085 3.125-.242V25.785h4.66z" fill="#fff"></path></svg>
                        </a>
                        <a className='flex h-[34px] w-10 items-center justify-center rounded-sm bg-white px-3 shadow-xs hover:bg-gray-50 [&_svg]:size-4' href={`http://www.linkedin.com/shareArticle?mini=true&title=${encodeURIComponent(shareText)}`} rel="noopener noreferrer" target='_blank'>
                            <svg fill="none" viewBox="0 0 16 16"><g clipPath="url(#social-linkedin_svg__clip0_537_833)"><path className="social-linkedin_svg__linkedin" clipRule="evenodd" d="M1.778 16h12.444c.982 0 1.778-.796 1.778-1.778V1.778C16 .796 15.204 0 14.222 0H1.778C.796 0 0 .796 0 1.778v12.444C0 15.204.796 16 1.778 16z" fill="#007ebb" fillRule="evenodd"></path><path clipRule="evenodd" d="M13.778 13.778h-2.374V9.734c0-1.109-.421-1.729-1.299-1.729-.955 0-1.453.645-1.453 1.729v4.044H6.363V6.074h2.289v1.038s.688-1.273 2.322-1.273c1.634 0 2.804.997 2.804 3.061v4.878zM3.634 5.065c-.78 0-1.411-.636-1.411-1.421s.631-1.422 1.41-1.422c.78 0 1.411.637 1.411 1.422 0 .785-.631 1.421-1.41 1.421zm-1.182 8.713h2.386V6.074H2.452v7.704z" fill="#fff" fillRule="evenodd"></path></g><defs><clipPath id="social-linkedin_svg__clip0_537_833"><path d="M0 0h16v16H0z" fill="#fff"></path></clipPath></defs></svg>
                        </a>
                    </div>
                    <Button className='dark:bg-black dark:text-white dark:hover:bg-black/90' onClick={handleDownload}>
                        <LucideIcon.Download />
                        Download image
                    </Button>
                </div>
                <img className='absolute inset-0 size-full object-cover' src={DotsPattern} />
                <div className='absolute inset-0' style={{background: getGradient()}} />
            </div>

            {/* Hidden clone for screenshots */}
            <div
                ref={profileCardRef}
                className='fixed left-[-9999px] top-0 z-[-1] flex w-fit justify-center overflow-hidden rounded-2xl bg-gray-50'
                style={{
                    width: cardFormat === 'square' ? '424px' : '348px'
                }}
            >
                <ProfileCard format={cardFormat} isScreenshot={true} />
                <img
                    className='absolute left-0 top-0'
                    src={DotsPattern}
                    style={{
                        height: '456px',
                        maxHeight: 'none',
                        maxWidth: 'none',
                        width: '456px'
                    }}
                />
                <div
                    className='absolute left-0 top-0'
                    style={{
                        height: '456px',
                        width: '456px',
                        background: getGradient()
                    }}
                />
            </div>
        </div>
    );
};

export default Profile;
