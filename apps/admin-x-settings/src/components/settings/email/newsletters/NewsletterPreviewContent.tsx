import CoverImage from '../../../../assets/images/user-cover.png';
import LatestPosts1 from '../../../../assets/images/latest-posts-1.png';
import LatestPosts2 from '../../../../assets/images/latest-posts-2.png';
import LatestPosts3 from '../../../../assets/images/latest-posts-3.png';
import clsx from 'clsx';
import {GhostOrb, Icon} from '@tryghost/admin-x-design-system';
import {isManagedEmail} from '@tryghost/admin-x-framework/api/config';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const NewsletterPreviewContent: React.FC<{
    senderName?: string;
    senderEmail: string | null;
    senderReplyTo: string | null;
    headerImage?: string | null;
    headerIcon?: string;
    headerTitle?: string | null;
    headerSubtitle?: string | null;
    showPostTitleSection: boolean;
    showExcerpt: boolean;
    titleAlignment?: string;
    titleFontCategory?: string;
    bodyFontCategory?: string;
    authorPlaceholder?: string;

    showCommentCta: boolean;
    showFeatureImage: boolean;
    showFeedback: boolean;
    showLatestPosts: boolean;
    showSubscriptionDetails: boolean;

    siteTitle?: string;
    footerContent?: string | null;
    showBadge?: boolean;

    backgroundColor?: string;
    borderColor?: string;
    secondaryBorderColor?: string;
    accentColor?: string;
    textColor?: string;
    secondaryTextColor?: string;
    titleColor?: string;
}> = ({
    senderName,
    senderEmail,
    senderReplyTo,
    headerImage,
    headerIcon,
    headerTitle,
    headerSubtitle,
    showPostTitleSection,
    showExcerpt,
    titleAlignment,
    titleFontCategory,
    bodyFontCategory,
    authorPlaceholder,

    showCommentCta,
    showFeatureImage,
    showFeedback,
    showLatestPosts,
    showSubscriptionDetails,

    siteTitle,
    footerContent,
    showBadge,

    backgroundColor,
    borderColor,
    secondaryBorderColor,
    accentColor,
    textColor,
    secondaryTextColor,
    titleColor
}) => {
    const showHeader = headerIcon || headerTitle;
    const {config} = useGlobalData();

    const currentDate = new Date().toLocaleDateString('default', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const currentYear = new Date().getFullYear();

    const backgroundColorIsDark = backgroundColor && textColorForBackgroundColor(backgroundColor).hex().toLowerCase() === '#ffffff';

    // Process footer content to add target and rel attributes to links
    const processedFooterContent = footerContent ? footerContent.replace(/<a/g, '<a target="_blank" rel="noopener noreferrer"') : '';

    let emailHeader;

    if (isManagedEmail(config)) {
        emailHeader = <><p className="leading-normal"><span className="font-semibold text-grey-900">From: </span><span>{senderName} ({senderEmail})</span></p>
            <p className="leading-normal">
                <span className="font-semibold text-grey-900">Reply-to: </span>{senderReplyTo ? senderReplyTo : senderEmail}
            </p>
        </>;
    } else {
        emailHeader = <><p className="leading-normal"><span className="font-semibold text-grey-900">{senderName}</span><span> {senderEmail}</span></p>
            <p className="leading-normal"><span className="font-semibold text-grey-900">To:</span> Jamie Larson jamie@example.com</p></>;
    }

    let excerptClasses = 'mb-5 text-pretty leading-[1.7] text-black';

    if (titleFontCategory === 'serif' && bodyFontCategory === 'serif') {
        excerptClasses = clsx(excerptClasses, 'mb-8 font-serif text-[2.0rem] leading-tight');
    } else if (titleFontCategory !== 'serif' && bodyFontCategory === 'serif') {
        excerptClasses = clsx(excerptClasses, 'mb-8 text-[1.7rem] leading-tight tracking-tight');
    } else if (titleFontCategory === 'serif' && bodyFontCategory !== 'serif') {
        excerptClasses = clsx(excerptClasses, 'mb-8 font-serif text-[2.0rem] leading-tight');
    } else {
        excerptClasses = clsx(excerptClasses, 'mb-8 text-[1.9rem] leading-tight tracking-tight');
    }

    if (titleAlignment === 'center') {
        excerptClasses = clsx(
            excerptClasses,
            'text-center'
        );
    }

    return (
        <div className="relative flex grow flex-col">
            <div className="absolute inset-0 m-5 flex items-center justify-center">
                <div className="mx-auto my-0 flex max-h-full w-full max-w-[700px] flex-col overflow-hidden rounded-[4px] text-black shadow-sm">
                    {/* Email header */}
                    <div className="flex-column flex min-h-[77px] justify-center rounded-t-sm border-b border-grey-200 bg-white px-6 text-sm text-grey-700">
                        {emailHeader}
                    </div>

                    {/* Email content */}
                    <div className="overflow-y-auto p-4 text-sm" style={{backgroundColor}}>
                        <div className="border border-transparent px-16" style={{borderColor}}>
                            {headerImage && (
                                <div>
                                    <img alt="" className="mb-4 mt-6 block" src={headerImage} />
                                </div>
                            )}
                            {showHeader && (
                                <div className="py-3" style={{borderColor: secondaryBorderColor}}>
                                    {headerIcon && <img alt="" className="mx-auto mb-2 size-10" role="presentation" src={headerIcon} />}
                                    {headerTitle && <h4 className="mb-1 text-center text-[1.6rem] font-bold uppercase leading-tight tracking-tight text-grey-900" style={{color: textColor}}>{headerTitle}</h4>}
                                    {headerSubtitle && <h5 className="mb-1 text-center text-[1.3rem] font-normal text-grey-700" style={{color: secondaryTextColor}}>{headerSubtitle}</h5>}
                                </div>
                            )}
                            {showPostTitleSection && (
                                <div className={clsx('flex flex-col py-8', titleAlignment === 'center' ? 'items-center' : 'items-start')}>
                                    <h2 className={clsx(
                                        'text-4xl font-bold leading-supertight text-black',
                                        titleFontCategory === 'serif' && 'font-serif',
                                        titleAlignment === 'center' ? 'text-center' : 'text-left',
                                        showExcerpt ? 'mb-2' : 'mb-8'
                                    )} style={{color: titleColor}}>
                                        Your email newsletter
                                    </h2>
                                    {showExcerpt && (
                                        <p className={excerptClasses}>A subtitle to highlight key points and engage your readers</p>
                                    )}
                                    <div className={clsx(
                                        'flex w-full justify-between text-center text-md leading-none text-grey-700',
                                        titleAlignment === 'center' ? 'flex-col gap-1' : 'flex-row'
                                    )}>
                                        <p className="pb-1 text-[1.3rem]" style={{color: secondaryTextColor}}>
                                            By {authorPlaceholder}
                                            <span className="before:pl-0.5 before:pr-1 before:content-['•']">{currentDate}</span>
                                        </p>
                                        <p className="pb-1 text-[1.3rem] underline" style={{color: secondaryTextColor}}><span>View in browser</span></p>
                                    </div>
                                </div>
                            )}

                            {/* Feature image */}
                            {showFeatureImage && (
                                <>
                                    <div className={clsx(
                                        'h-[300px] w-full max-w-[600px] bg-cover bg-no-repeat',
                                        showPostTitleSection ? '' : 'pt-6'
                                    )}>
                                        <img alt="Feature" className='min-h-full min-w-full shrink-0' src={CoverImage} />
                                    </div>
                                    <div className="mt-1 w-full max-w-[600px] pb-8 text-center text-[1.3rem] text-grey-700" style={{color: secondaryTextColor}}>Feature image caption</div>
                                </>
                            )}

                            <div className={clsx(
                                'max-w-[600px] border-b border-grey-200 pb-5 leading-[1.7] text-black',
                                bodyFontCategory === 'serif' ? 'font-serif text-[1.8rem]' : 'text-[1.7rem] tracking-tight',
                                (showFeatureImage || showPostTitleSection) ? '' : 'pt-8'
                            )} style={{borderColor: secondaryBorderColor}}>
                                <p className="mb-5" style={{color: textColor}}>This is what your content will look like when you send one of your posts as an email newsletter to your subscribers.</p>
                                <p className="mb-5" style={{color: textColor}}>Over there on the right you&apos;ll see some settings that allow you to customize the look and feel of this template to make it perfectly suited to your brand. Email templates are exceptionally finnicky to make, but we&apos;ve spent a long time optimising this one to make it work beautifully across devices, email clients and content types.</p>
                                <p className="mb-5" style={{color: textColor}}>So, you can trust that every email you send with Ghost will look great and work well. Just like the rest of your site.</p>
                            </div>

                            {/* Feedback */}
                            {(showFeedback || showCommentCta) && (
                                <div className="grid gap-5 border-b border-grey-200 px-6 py-5" style={{borderColor: secondaryBorderColor}}>
                                    <div className="flex justify-center gap-3">
                                        {showFeedback && (
                                            <>
                                                <button className="pointer-events-none cursor-default whitespace-nowrap rounded-[2.2rem] bg-transparent font-semibold" type="button">
                                                    <span className="inline-flex items-center gap-2 px-[18px] py-[7px]" style={{color: textColor}}>
                                                        <Icon colorClass='' name="thumbs-up" size="md" />
                                                        <span>More like this</span>
                                                    </span>
                                                </button>
                                                <button className="pointer-events-none cursor-default whitespace-nowrap rounded-[2.2rem] bg-transparent font-semibold" type="button">
                                                    <span className="inline-flex items-center gap-2 px-[18px] py-[7px]" style={{color: textColor}}>
                                                        <Icon colorClass='' name="thumbs-down" />
                                                        <span>Less like this</span>
                                                    </span>
                                                </button>
                                            </>
                                        )}
                                        {showCommentCta && (
                                            <button className="pointer-events-none cursor-default whitespace-nowrap rounded-[2.2rem] bg-transparent font-semibold" type="button">
                                                <span className="inline-flex items-center gap-2 px-[18px] py-[7px]" style={{color: textColor}}>
                                                    <Icon colorClass='' name="comment" />
                                                    <span>Comment</span>
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Latest posts */}
                            {showLatestPosts && (
                                <div className="border-b border-grey-200 py-6" style={{borderColor: secondaryBorderColor}}>
                                    <h3 className="mb-4 mt-2 pb-1 text-[1.2rem] font-semibold uppercase tracking-wide" style={{color: titleColor}}>Keep reading</h3>
                                    <div className="flex justify-between gap-4 py-2">
                                        <div>
                                            <h4 className="mb-1 mt-0.5 text-[1.9rem]" style={{color: textColor}}>The three latest posts published on your site</h4>
                                            <p className="m-0 text-base text-grey-700" style={{color: secondaryTextColor}}>Posts sent as an email only will never be shown here.</p>
                                        </div>
                                        <div className="aspect-square h-auto w-full max-w-[100px] bg-grey-200 bg-cover bg-no-repeat">
                                            <img alt="Latest post" src={LatestPosts1} />
                                        </div>
                                    </div>
                                    <div className="flex justify-between gap-4 py-2">
                                        <div>
                                            <h4 className="mb-1 mt-0.5 text-[1.9rem]" style={{color: textColor}}>Displayed at the bottom of each newsletter</h4>
                                            <p className="m-0 text-base text-grey-700" style={{color: secondaryTextColor}}>Giving your readers one more place to discover your stories.</p>
                                        </div>
                                        <div className="aspect-square h-auto w-full max-w-[100px] bg-grey-200 bg-cover bg-no-repeat">
                                            <img alt="Latest post" src={LatestPosts2} />
                                        </div>
                                    </div>
                                    <div className="flex justify-between gap-4 py-2">
                                        <div>
                                            <h4 className="mb-1 mt-0.5 text-[1.9rem]" style={{color: textColor}}>To keep your work front and center</h4>
                                            <p className="m-0 text-base text-grey-700" style={{color: secondaryTextColor}}>Making sure that your audience stays engaged.</p>
                                        </div>
                                        <div className="aspect-square h-auto w-full max-w-[100px] bg-grey-200 bg-cover bg-no-repeat">
                                            <img alt="Latest post" src={LatestPosts3} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Subscription details */}
                            {showSubscriptionDetails && (
                                <div className="border-b border-grey-200 py-8" style={{borderColor: secondaryBorderColor}}>
                                    <h4 className="mb-3 text-[1.2rem] uppercase tracking-wide" style={{color: titleColor}}>Subscription details</h4>
                                    <p className="m-0 mb-4 text-base" style={{color: textColor}}>You are receiving this because you are a paid subscriber to {siteTitle}. Your subscription will renew on 17 Jul 2024.</p>
                                    <div className="flex">
                                        <div className="shrink-0 text-base">
                                            <p style={{color: textColor}}>Name: Jamie Larson</p>
                                            <p style={{color: textColor}}>Email: jamie@example.com</p>
                                            <p style={{color: textColor}}>Member since: 17 July 2023</p>
                                        </div>
                                        <span className={clsx('w-full self-end whitespace-nowrap text-right text-base font-semibold', backgroundColorIsDark && 'text-white underline')} style={{color: accentColor}}>
                                            Manage subscription →
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex flex-col items-center pt-10">
                                <div dangerouslySetInnerHTML={{__html: processedFooterContent || ''}} className="text break-words px-8 py-3 text-center text-[1.3rem] leading-base text-grey-700 [&_a]:underline" style={{color: secondaryTextColor}} />

                                <div className="px-8 pb-14 pt-3 text-center text-[1.3rem] text-grey-700">
                                    <span style={{color: secondaryTextColor}}>{siteTitle} © {currentYear} &mdash; </span>
                                    <span className="pointer-events-none cursor-auto underline" style={{color: secondaryTextColor}}>Unsubscribe</span>
                                </div>

                                {showBadge && (
                                    <div className="flex flex-col items-center pb-[40px] pt-[10px]">
                                        <a className="pointer-events-none inline-flex cursor-auto items-center px-2 py-1 text-[1.25rem] font-semibold tracking-tight text-grey-900" href="https://ghost.org">
                                            <GhostOrb className="mr-[6px] size-4"/>
                                            <span>Powered by Ghost</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsletterPreviewContent;
