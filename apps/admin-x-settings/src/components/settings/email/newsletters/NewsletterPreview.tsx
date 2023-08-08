import CoverImage from '../../../../assets/images/user-cover.png';
import Icon from '../../../../admin-x-ds/global/Icon';
import LatestPosts1 from '../../../../assets/images/latest-posts-1.png';
import LatestPosts2 from '../../../../assets/images/latest-posts-2.png';
import LatestPosts3 from '../../../../assets/images/latest-posts-3.png';
import React from 'react';
import clsx from 'clsx';
import {ReactComponent as GhostOrb} from '../../../../admin-x-ds/assets/images/ghost-orb.svg';
import {Newsletter} from '../../../../api/newsletters';
import {fullEmailAddress} from '../../../../api/site';
import {getSettingValues} from '../../../../api/settings';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const NewsletterPreview: React.FC<{newsletter: Newsletter}> = ({newsletter}) => {
    const {currentUser, settings, siteData, config} = useGlobalData();
    const [title, icon, commentsEnabled] = getSettingValues<string>(settings, ['title', 'icon', 'comments_enabled']);

    let headerTitle: string | null = null;
    if (newsletter.show_header_title) {
        headerTitle = title || null;
    } else if (newsletter.show_header_name) {
        headerTitle = newsletter.name;
    }

    const headerSubtitle = (newsletter.show_header_title && newsletter.show_header_name) && newsletter.name;

    const showHeader = (newsletter.show_header_icon && icon) || headerTitle;

    const currentDate = new Date().toLocaleDateString('default', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const currentYear = new Date().getFullYear();

    const showCommentCta = newsletter.show_comment_cta && commentsEnabled !== 'off';
    const showFeedback = newsletter.feedback_enabled && config.labs.audienceFeedback;

    return (
        <div className="relative flex grow flex-col">
            <div className="absolute inset-0 m-5 flex items-center justify-center">
                <div className="mx-auto my-0 flex max-h-full w-full max-w-[700px] flex-col overflow-hidden rounded-[4px] text-black shadow-sm">
                    {/* Email header */}
                    <div className="flex-column flex min-h-[77px] justify-center rounded-t-sm border-b border-grey-200 bg-white px-6 text-sm text-grey-700">
                        <p className="leading-normal"><span className="font-semibold text-grey-900">{newsletter.sender_name || title}</span><span> {fullEmailAddress(newsletter.sender_email || 'noreply', siteData)}</span></p>
                        <p className="leading-normal"><span className="font-semibold text-grey-900">To:</span> Jamie Larson jamie@example.com</p>
                    </div>

                    {/* Email content */}
                    <div className="overflow-y-auto bg-white px-20 text-sm">
                        {newsletter.header_image && (
                            <div>
                                <img alt="" className="mt-6 block" src={newsletter.header_image} />
                            </div>
                        )}
                        {showHeader && (
                            <div className="border-b border-grey-200 py-12">
                                {(newsletter.show_header_icon && icon) && <img alt="" className="mx-auto mb-2 h-10 w-10" role="presentation" src={icon} />}
                                {headerTitle && <h4 className="mb-1 text-center text-[1.6rem] font-bold uppercase leading-tight tracking-tight text-grey-900">{headerTitle}</h4>}
                                {headerSubtitle && <h5 className="mb-1 text-center text-[1.4rem] font-normal leading-tight text-grey-600">{headerSubtitle}</h5>}
                            </div>
                        )}
                        {newsletter.show_post_title_section && (
                            <div className={clsx('flex flex-col pb-10 pt-12', newsletter.title_alignment === 'center' ? 'items-center' : 'items-start')}>
                                <h2 className={clsx(
                                    'pb-4 text-5xl font-bold leading-supertight text-black',
                                    newsletter.title_font_category === 'serif' && 'font-serif',
                                    newsletter.title_alignment === 'center' ? 'text-center' : 'text-left'
                                )}>
                                    Your email newsletter
                                </h2>
                                <div className={clsx(
                                    'flex w-full justify-between text-center text-sm leading-none tracking-[0.1px] text-grey-600',
                                    newsletter.title_alignment === 'center' ? 'flex-col' : 'flex-row'
                                )}>
                                    <p className="pb-2">
                                        By {currentUser.name || currentUser.email}
                                        <span className="before:pl-0.5 before:pr-1 before:content-['•']">{currentDate}</span>
                                        {showCommentCta && (
                                            <span className="before:pl-0.5 before:pr-1 before:content-['•']">
                                                <Icon className="mt-[-2px] inline-block" colorClass="text-grey-600" name="comment" size="sm"/>
                                            </span>
                                        )}
                                    </p>
                                    <p className="pb-2 underline"><span>View in browser</span></p>
                                </div>
                            </div>
                        )}

                        {/* Feature image */}
                        {newsletter.show_feature_image && (
                            <>
                                <div className="h-[300px] w-full max-w-[600px] bg-grey-200 bg-cover bg-no-repeat">
                                    <img alt="Feature" className='min-h-full min-w-full shrink-0' src={CoverImage} />
                                </div>
                                <div className="mt-1 w-full max-w-[600px] pb-[30px] text-center text-[1.3rem] text-grey-600">Feature image caption</div>
                            </>
                        )}

                        <div className={clsx('max-w-[600px] border-b border-grey-200 py-5 text-[1.6rem] leading-[1.7] text-black', newsletter.body_font_category === 'serif' && 'font-serif')}>
                            <p className="mb-5">This is what your content will look like when you send one of your posts as an email newsletter to your subscribers.</p>
                            <p className="mb-5">Over there on the left you&apos;ll see some settings that allow you to customize the look and feel of this template to make it perfectly suited to your brand. Email templates are exceptionally finnicky to make, but we&apos;ve spent a long time optimising this one to make it work beautifully across devices, email clients and content types.</p>
                            <p className="mb-5">So, you can trust that every email you send with Ghost will look great and work well. Just like the rest of your site.</p>
                        </div>

                        {/* Feedback */}
                        {(showFeedback || showCommentCta) && (
                            <div className="grid gap-5 border-b border-grey-200 px-6 py-5">
                                <div className="flex justify-center gap-3">
                                    {showFeedback && (
                                        <>
                                            <button className="pointer-events-none cursor-default whitespace-nowrap rounded-[2.2rem] bg-transparent font-semibold" type="button">
                                                <span className="inline-flex items-center gap-2 px-[18px] py-[7px]">
                                                    <Icon name="thumbs-up" size="md" />
                                                    <span>More like this</span>
                                                </span>
                                            </button>
                                            <button className="pointer-events-none cursor-default whitespace-nowrap rounded-[2.2rem] bg-transparent font-semibold" type="button">
                                                <span className="inline-flex items-center gap-2 px-[18px] py-[7px]">
                                                    <Icon name="thumbs-down" />
                                                    <span>Less like this</span>
                                                </span>
                                            </button>
                                        </>
                                    )}
                                    {showCommentCta && (
                                        <button className="pointer-events-none cursor-default whitespace-nowrap rounded-[2.2rem] bg-transparent font-semibold" type="button">
                                            <span className="inline-flex items-center gap-2 px-[18px] py-[7px]">
                                                <Icon name="comment" />
                                                <span>Comment</span>
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Latest posts */}
                        {newsletter.show_latest_posts && (
                            <div className="border-b border-grey-200 py-6">
                                <h3 className="mb-4 mt-2 pb-1 text-[1.2rem] font-semibold uppercase tracking-wide">Keep reading</h3>
                                <div className="flex justify-between gap-4 py-2">
                                    <div>
                                        <h4 className="mb-1 mt-0.5 text-[1.9rem]">The three latest posts published on your site</h4>
                                        <p className="m-0 text-base text-grey-600">Posts sent as an email only will never be shown here.</p>
                                    </div>
                                    <div className="aspect-square h-auto w-full max-w-[100px] bg-grey-200 bg-cover bg-no-repeat">
                                        <img alt="Latest post" src={LatestPosts1} />
                                    </div>
                                </div>
                                <div className="flex justify-between gap-4 py-2">
                                    <div>
                                        <h4 className="mb-1 mt-0.5 text-[1.9rem]">Displayed at the bottom of each newsletter</h4>
                                        <p className="m-0 text-base text-grey-600">Giving your readers one more place to discover your stories.</p>
                                    </div>
                                    <div className="aspect-square h-auto w-full max-w-[100px] bg-grey-200 bg-cover bg-no-repeat">
                                        <img alt="Latest post" src={LatestPosts2} />
                                    </div>
                                </div>
                                <div className="flex justify-between gap-4 py-2">
                                    <div>
                                        <h4 className="mb-1 mt-0.5 text-[1.9rem]">To keep your work front and center</h4>
                                        <p className="m-0 text-base text-grey-600">Making sure that your audience stays engaged.</p>
                                    </div>
                                    <div className="aspect-square h-auto w-full max-w-[100px] bg-grey-200 bg-cover bg-no-repeat">
                                        <img alt="Latest post" src={LatestPosts3} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subscription details */}
                        {newsletter.show_subscription_details && (
                            <div className="border-b border-grey-200 py-8">
                                <h4 className="mb-3 text-[1.2rem] uppercase tracking-wide">Subscription details</h4>
                                <p className="m-0 mb-4 text-base">You are receiving this because you are a paid subscriber to The Local Host. Your subscription will renew on 17 Jul 2024.</p>
                                <div className="flex">
                                    <div className="shrink-0 text-base">
                                        <p>Name: Jamie Larson</p>
                                        <p>Email: jamie@example.com</p>
                                        <p>Member since: 17 July 2023</p>
                                    </div>
                                    <span className="w-full self-end whitespace-nowrap text-right text-base font-semibold text-pink">Manage subscription →</span>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex flex-col items-center pt-10">
                            <div dangerouslySetInnerHTML={{__html: newsletter.footer_content || ''}} className="text break-words px-8 py-3 text-center text-[1.3rem] leading-base text-grey-600" />

                            <div className="px-8 pb-14 pt-3 text-center text-[1.3rem] text-grey-600">
                                <span>{title} © {currentYear} &mdash; </span>
                                <span className="pointer-events-none cursor-auto underline">Unsubscribe</span>
                            </div>

                            {newsletter.show_badge && (
                                <div className="flex flex-col items-center pb-[40px] pt-[10px]">
                                    <a className="pointer-events-none inline-flex cursor-auto items-center px-2 py-1 text-[1.25rem] font-semibold tracking-tight text-grey-900" href="https://ghost.org">
                                        <GhostOrb className="mr-[6px] h-4 w-4"/>
                                        <span>Powered by Ghost</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsletterPreview;
