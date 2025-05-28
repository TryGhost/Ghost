import CoverImage from '../../../../assets/images/user-cover.png';
import LatestPosts1 from '../../../../assets/images/latest-posts-1.png';
import LatestPosts2 from '../../../../assets/images/latest-posts-2.png';
import LatestPosts3 from '../../../../assets/images/latest-posts-3.png';
import clsx from 'clsx';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
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
    titleFontWeight?: string;
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
    headerBackgroundColor?: string;
    accentColor?: string;
    textColor?: string;
    secondaryTextColor?: string;
    headerTextColor?: string;
    secondaryHeaderTextColor?: string;
    postTitleColor?: string;
    sectionTitleColor?: string;
    dividerColor?: string;
    buttonColor?: string;
    linkColor?: string;
    buttonStyle?: string;
    buttonCorners?: string;
    imageCorners?: string;
    linkStyle?: string;
    dividerStyle?: string;
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
    titleFontWeight,
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
    headerBackgroundColor,
    accentColor,
    textColor,
    secondaryTextColor,
    headerTextColor,
    secondaryHeaderTextColor,
    postTitleColor,
    sectionTitleColor,
    dividerColor,
    buttonColor,
    linkColor,
    buttonCorners,
    buttonStyle,
    imageCorners,
    linkStyle,
    dividerStyle
}) => {
    const showHeader = headerIcon || headerTitle;
    const {config} = useGlobalData();
    const hasEmailCustomizationAlpha = useFeatureFlag('emailCustomizationAlpha');
    const hasEmailCustomization = useFeatureFlag('emailCustomization');

    const hasAnyEmailCustomization = hasEmailCustomization || hasEmailCustomizationAlpha;

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
                        <div className="px-[5.4rem]" style={{backgroundColor: headerBackgroundColor}}>
                            {headerImage && (
                                <div>
                                    <img alt="" className="mb-4 block" src={headerImage} />
                                </div>
                            )}
                            {showHeader && (
                                <div className="py-3">
                                    {headerIcon && <img alt="" className="mx-auto mb-2 size-10" role="presentation" src={headerIcon} />}
                                    {headerTitle && <h4 className="mb-1 text-center text-[1.6rem] font-bold uppercase leading-tight tracking-tight text-grey-900" style={{color: textColor}}>{headerTitle}</h4>}
                                    {headerSubtitle && <h5 className="mb-1 text-center text-[1.3rem] font-normal text-grey-700" style={{color: secondaryTextColor}}>{headerSubtitle}</h5>}
                                </div>
                            )}
                            {showPostTitleSection && (
                                <div className={clsx('flex flex-col py-8', titleAlignment === 'center' ? 'items-center' : 'items-start')}>
                                    {hasAnyEmailCustomization ? (
                                        <>
                                            <h2 className={clsx(
                                                'text-4xl font-bold leading-supertight text-black',
                                                titleFontCategory === 'serif' && 'font-serif',
                                                titleFontWeight === 'normal' && 'font-normal',
                                                titleFontWeight === 'medium' && 'font-medium',
                                                titleFontWeight === 'semibold' && 'font-semibold',
                                                titleFontWeight === 'bold' && 'font-bold',
                                                titleAlignment === 'center' ? 'text-center' : 'text-left',
                                                showExcerpt ? 'mb-2' : 'mb-8'
                                            )} style={{color: postTitleColor}}>Delivery Apps Are Changing Your Neighbourhood</h2>
                                            {showExcerpt && (
                                                <p className={excerptClasses} style={{color: headerTextColor}}>Delivery apps are thriving—local restaurants and workers are paying the price.</p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <h2 className={clsx(
                                                'text-4xl font-bold leading-supertight text-black',
                                                titleFontCategory === 'serif' && 'font-serif',
                                                titleAlignment === 'center' ? 'text-center' : 'text-left',
                                                showExcerpt ? 'mb-2' : 'mb-8'
                                            )} style={{color: postTitleColor}}>
                                                Your email newsletter
                                            </h2>
                                            {showExcerpt && (
                                                <p className={excerptClasses}>A subtitle to highlight key points and engage your readers</p>
                                            )}
                                        </>
                                    )}
                                    <div className={clsx(
                                        'flex w-full justify-between text-center text-md leading-none text-grey-700',
                                        titleAlignment === 'center' ? 'flex-col gap-1' : 'flex-row'
                                    )}>
                                        <p className="pb-1 text-[1.3rem]" style={{color: hasAnyEmailCustomization ? secondaryHeaderTextColor : secondaryTextColor}}>
                                            By {authorPlaceholder}
                                            <span className="before:pl-0.5 before:pr-1 before:content-['•']">{currentDate}</span>
                                        </p>
                                        <p className="pb-1 text-[1.3rem] underline" style={{color: hasAnyEmailCustomization ? secondaryHeaderTextColor : secondaryTextColor}}><span>View in browser</span></p>
                                    </div>
                                </div>
                            )}

                            {/* Feature image */}
                            {showFeatureImage && (
                                <>
                                    <div className={clsx(
                                        'w-full max-w-[600px] bg-cover bg-no-repeat',
                                        showPostTitleSection ? '' : 'pt-6',
                                        hasAnyEmailCustomization ? 'h-[unset]' : 'h-[300px]'
                                    )}>
                                        <img alt="Feature" className={clsx(
                                            'min-h-full min-w-full shrink-0',
                                            imageCorners === 'square' && 'rounded-none',
                                            imageCorners === 'rounded' && 'rounded-md'
                                        )} src={hasAnyEmailCustomization ? 'https://images.unsplash.com/photo-1526367790999-0150786686a2?q=80&w=2942&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' : CoverImage} />
                                    </div>
                                    <div className="mt-1 w-full max-w-[600px] pb-8 text-center text-[1.3rem] text-grey-700" style={{color: hasAnyEmailCustomization ? secondaryHeaderTextColor : secondaryTextColor}}>Feature image caption</div>
                                </>
                            )}
                        </div>

                        <div className={clsx('px-[5.4rem]', headerBackgroundColor !== 'transparent' && 'pt-10')}>
                            <div className={clsx(
                                'max-w-[600px] border-b border-grey-200 pb-5 leading-[27.2px] text-black',
                                dividerStyle === 'dashed' && 'border-dashed',
                                dividerStyle === 'dotted' && 'border-b-2 border-dotted',
                                bodyFontCategory === 'serif' ? 'font-serif text-[1.8rem]' : 'text-[1.7rem] tracking-tight',
                                (showFeatureImage || showPostTitleSection) ? '' : 'pt-8'
                            )} style={{borderColor: dividerColor}}>
                                {hasAnyEmailCustomization ? (
                                    <>
                                        <p className="mb-6" style={{color: textColor}}>The promise of delivery apps is simple: tap a button, and your favorite meal arrives at your door within minutes. But behind the scenes, these platforms are <a className={clsx(linkStyle === 'underline' && 'underline', linkStyle === 'bold' && 'font-bold')} href="#" style={{color: linkColor || accentColor}}>reshaping local economies</a> in ways few people realize.</p>
                                        <p className="mb-6" style={{color: textColor}}>Across the country, small restaurants are grappling with rising fees—sometimes up to 30% per order—cutting into already-thin profit margins. In some cases, beloved neighborhood spots have had to shut their doors, unable to keep up with the financial strain. Meanwhile, delivery workers, the backbone of these services, often face unpredictable wages and challenging working conditions.</p>
                                        <hr className={clsx('my-6 border-[#e0e7eb]', dividerStyle === 'dashed' && 'border-dashed', dividerStyle === 'dotted' && 'border-b-2 border-t-0 border-dotted')} style={{borderColor: dividerColor}} />
                                        <p className="mb-6" style={{color: textColor}}>If you enjoy this piece and want more deep dives like it, consider upgrading your membership. Paid subscribers get <a className={clsx(linkStyle === 'underline' && 'underline', linkStyle === 'bold' && 'font-bold')} href="#" style={{color: linkColor || accentColor}}>exclusive reports</a>, early access to new features, and a behind-the-scenes look at how we put these stories together. Your support helps us continue delivering thoughtful, in-depth journalism straight to you.</p>
                                        <button
                                            className={clsx(
                                                'border px-[18px] py-2 font-sans text-[15px]',
                                                buttonCorners === 'rounded' && 'rounded-[6px]',
                                                buttonCorners === 'pill' && 'rounded-full',
                                                buttonCorners === 'square' && 'rounded-none',
                                                buttonStyle === 'outline'
                                                    ? 'bg-transparent'
                                                    : 'border-transparent text-white',
                                                linkStyle === 'bold' ? 'font-bold' : 'font-semibold'
                                            )}
                                            style={
                                                buttonStyle === 'outline'
                                                    ? {
                                                        borderColor: buttonColor || accentColor,
                                                        color: buttonColor || accentColor
                                                    }
                                                    : {
                                                        backgroundColor: buttonColor || accentColor
                                                    }
                                            }
                                            type="button"
                                        >
                                            Upgrade now
                                        </button>
                                        <hr className={clsx('my-6 border-[#e0e7eb]', dividerStyle === 'dashed' && 'border-dashed', dividerStyle === 'dotted' && 'border-b-2 border-t-0 border-dotted')} style={{borderColor: dividerColor}} />
                                        <p className="mb-6" style={{color: textColor}}>Yet, the convenience factor keeps us coming back. The ease of one-click ordering means fewer people are dining in, changing the social fabric of our communities. Restaurants designed for shared experiences are evolving into ghost kitchens, optimized for delivery rather than connection.</p>
                                        <h3
                                            className={clsx(
                                                'mb-[13px] mt-[39px] text-[2.6rem] leading-supertight',
                                                titleFontCategory === 'serif' && 'font-serif',
                                                titleFontCategory === 'sans_serif' && 'font-sans',
                                                titleFontWeight === 'normal' && 'font-normal',
                                                titleFontWeight === 'medium' && 'font-medium',
                                                titleFontWeight === 'semibold' && 'font-semibold',
                                                titleFontWeight === 'bold' && 'font-bold'
                                            )}
                                            style={{color: sectionTitleColor}}>When Convenience Comes at a Cost</h3>
                                        <p className="mb-6" style={{color: textColor}}>So, what&apos;s the future of food culture in an on-demand world? Can these platforms adapt to better support small businesses and workers? Or will we wake up one day to find that the places we once loved have vanished?</p>
                                        <p className="mb-6" style={{color: textColor}}>Some cities are beginning to push back. In San Francisco, legislation has been proposed to cap delivery app fees and ensure a fairer share of profits for restaurants. Other local governments are exploring ways to offer support to brick-and-mortar establishments, whether through grants, tax relief, or public campaigns that encourage residents to dine in more often.</p>
                                        <h3
                                            className={clsx(
                                                'mb-[13px] mt-[39px] text-[2.6rem] leading-supertight',
                                                titleFontCategory === 'serif' && 'font-serif',
                                                titleFontCategory === 'sans_serif' && 'font-sans',
                                                titleFontWeight === 'normal' && 'font-normal',
                                                titleFontWeight === 'medium' && 'font-medium',
                                                titleFontWeight === 'semibold' && 'font-semibold',
                                                titleFontWeight === 'bold' && 'font-bold'
                                            )}
                                            style={{color: sectionTitleColor}}>Reimagining How We Eat</h3>
                                        <p className="mb-6" style={{color: textColor}}>Consumers are also starting to pay more attention. There&apos;s a growing movement toward mindful eating—not just in terms of ingredients, but in how we support the systems that bring food to our tables. Choosing to pick up instead of ordering in, tipping delivery drivers fairly, or subscribing to local restaurant coalitions can all make a difference.</p>
                                        <p className="mb-6" style={{color: textColor}}>Ultimately, the story of delivery apps isn&apos;t just about technology or convenience—it&apos;s about the kind of communities we want to live in. And that future depends, in part, on the choices we make every day.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="mb-6" style={{color: textColor}}>This is what your content will look like when you send one of your posts as an email newsletter to your subscribers.</p>
                                        <p className="mb-6" style={{color: textColor}}>Over there on the right you&apos;ll see some settings that allow you to customize the look and feel of this template to make it perfectly suited to your brand. Email templates are exceptionally finnicky to make, but we&apos;ve spent a long time optimising this one to make it work beautifully across devices, email clients and content types.</p>
                                        <p className="mb-6" style={{color: textColor}}>So, you can trust that every email you send with Ghost will look great and work well. Just like the rest of your site.</p>
                                    </>
                                )}
                            </div>

                            {/* Feedback */}
                            {(showFeedback || showCommentCta) && (
                                <div className={clsx('grid gap-5 border-b border-grey-200 px-6 py-5', dividerStyle === 'dashed' && 'border-dashed', dividerStyle === 'dotted' && 'border-b-2 border-dotted')} style={{borderColor: dividerColor}}>
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
                                <div className={clsx('border-b border-grey-200 py-6', dividerStyle === 'dashed' && 'border-dashed', dividerStyle === 'dotted' && 'border-b-2 border-dotted')} style={{borderColor: dividerColor}}>
                                    <h3 className="mb-4 mt-2 pb-1 text-[1.2rem] font-semibold uppercase tracking-wide text-black">Keep reading</h3>
                                    <div className="flex justify-between gap-4 py-2">
                                        <div>
                                            <h4
                                                className={clsx(
                                                    'mt-0.5 text-[1.9rem] text-black',
                                                    hasAnyEmailCustomization && titleFontCategory === 'serif' && 'font-serif',
                                                    titleFontWeight === 'normal' && 'font-normal',
                                                    titleFontWeight === 'medium' && 'font-medium',
                                                    titleFontWeight === 'semibold' && 'font-semibold',
                                                    titleFontWeight === 'bold' && 'font-bold'
                                                )}
                                                style={{color: sectionTitleColor}}>The three latest posts published on your site</h4>
                                            <p className="m-0 text-base text-grey-700" style={{color: secondaryTextColor}}>Posts sent as an email only will never be shown here.</p>
                                        </div>
                                        <div className="aspect-square h-auto w-full max-w-[100px] bg-cover bg-no-repeat">
                                            <img alt="Latest post" className={clsx(
                                                imageCorners === 'square' && 'rounded-none',
                                                imageCorners === 'rounded' && 'rounded-md'
                                            )} src={LatestPosts1} />
                                        </div>
                                    </div>
                                    <div className="flex justify-between gap-4 py-2">
                                        <div>
                                            <h4
                                                className={clsx(
                                                    'mt-0.5 text-[1.9rem] text-black',
                                                    hasAnyEmailCustomization && titleFontCategory === 'serif' && 'font-serif',
                                                    titleFontWeight === 'normal' && 'font-normal',
                                                    titleFontWeight === 'medium' && 'font-medium',
                                                    titleFontWeight === 'semibold' && 'font-semibold',
                                                    titleFontWeight === 'bold' && 'font-bold'
                                                )} style={{color: sectionTitleColor}}>Displayed at the bottom of each newsletter</h4>
                                            <p className="m-0 text-base text-grey-700" style={{color: secondaryTextColor}}>Giving your readers one more place to discover your stories.</p>
                                        </div>
                                        <div className="aspect-square h-auto w-full max-w-[100px] bg-cover bg-no-repeat">
                                            <img alt="Latest post" className={clsx(
                                                imageCorners === 'square' && 'rounded-none',
                                                imageCorners === 'rounded' && 'rounded-md'
                                            )} src={LatestPosts2} />
                                        </div>
                                    </div>
                                    <div className="flex justify-between gap-4 py-2">
                                        <div>
                                            <h4
                                                className={clsx(
                                                    'mt-0.5 text-[1.9rem] text-black',
                                                    hasAnyEmailCustomization && titleFontCategory === 'serif' && 'font-serif',
                                                    titleFontWeight === 'normal' && 'font-normal',
                                                    titleFontWeight === 'medium' && 'font-medium',
                                                    titleFontWeight === 'semibold' && 'font-semibold',
                                                    titleFontWeight === 'bold' && 'font-bold'
                                                )} style={{color: sectionTitleColor}}>To keep your work front and center</h4>
                                            <p className="m-0 text-base text-grey-700" style={{color: secondaryTextColor}}>Making sure that your audience stays engaged.</p>
                                        </div>
                                        <div className="aspect-square h-auto w-full max-w-[100px] bg-cover bg-no-repeat">
                                            <img alt="Latest post" className={clsx(
                                                imageCorners === 'square' && 'rounded-none',
                                                imageCorners === 'rounded' && 'rounded-md'
                                            )} src={LatestPosts3} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Subscription details */}
                            {showSubscriptionDetails && (
                                <div className={clsx('border-b border-grey-200 py-8', dividerStyle === 'dashed' && 'border-dashed', dividerStyle === 'dotted' && 'border-b-2 border-dotted')} style={{borderColor: dividerColor}}>
                                    <h4 className="mb-3 text-[1.2rem] uppercase tracking-wide text-black">Subscription details</h4>
                                    <p className="m-0 mb-4 text-base" style={{color: textColor}}>You are receiving this because you are a paid subscriber to {siteTitle}. Your subscription will renew on 17 Jul 2024.</p>
                                    <div className="flex">
                                        <div className="shrink-0 text-base">
                                            <p style={{color: textColor}}>Name: Jamie Larson</p>
                                            <p style={{color: textColor}}>Email: jamie@example.com</p>
                                            <p style={{color: textColor}}>Member since: 17 July 2023</p>
                                        </div>
                                        <span className={clsx('w-full self-end whitespace-nowrap text-right text-base text-grey-700 underline', backgroundColorIsDark && 'text-white')}>
                                            Manage subscription
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
                                        <a className="pointer-events-none inline-flex cursor-auto items-center px-2 py-1 text-[1.25rem] font-semibold tracking-tight text-grey-900" href="https://ghost.org" style={{color: textColor}}>
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
