import Icon from '../../../../admin-x-ds/global/Icon';
import React from 'react';
import {ReactComponent as GhostOrb} from '../../../../admin-x-ds/assets/images/ghost-orb.svg';

const NewsletterPreview: React.FC = () => {
    return (
        <div className="relative flex grow flex-col">
            <div className="GIGI absolute inset-0 m-5">
                <div className="mx-auto my-0 flex h-full w-full max-w-[700px] flex-col overflow-hidden rounded-[4px] text-black shadow-sm">

                    {/* Email header */}
                    <div className="flex-column flex min-h-[77px] justify-center rounded-t-sm border-b border-grey-200 bg-grey-100 px-6 text-sm text-grey-700">
                        <p className="leading-normal"><span className="font-semibold text-grey-900">Ghost</span><span> noreply@localhost</span></p>
                        <p className="leading-normal"><span className="font-semibold text-grey-900">To:</span> Jamie Larson jamie@example.com</p>
                    </div>

                    {/* Email content */}
                    <div className="overflow-y-auto bg-white px-20 text-sm">
                        <div>
                            <img alt="" className="mt-6 block" src="https://images.unsplash.com/photo-1681898190846-0a133b5b7fe0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"/>
                        </div>
                        <div className="border-b border-grey-200 py-12">
                            <h4 className="mb-1 text-center text-[1.6rem] font-bold uppercase leading-tight tracking-tight text-grey-900">My cool publication</h4>
                            <h5 className="mb-1 text-center text-[1.4rem] font-normal leading-tight text-grey-600">My cute newsletter</h5>
                        </div>
                        <div className="flex flex-col items-center pb-10 pt-12">
                            <h2 className="pb-4 text-center text-5xl font-bold leading-supertight text-black">Your email newsletter</h2>
                            <div className="flex w-full flex-col justify-between text-center text-sm leading-none tracking-[0.1px] text-grey-600">
                                <p className="pb-2">By Djordje Vlaisavljevic<span className="before:pl-0.5 before:pr-1 before:content-['•']">17 Jul 2023</span><span className="before:pl-0.5 before:pr-1 before:content-['•']"><Icon className="-mt-[2px] inline-block" colorClass="text-grey-600" name="comment" size="sm"/></span></p>
                                <p className="pb-2 underline"><span>View in browser</span></p>
                            </div>
                        </div>

                        {/* Feature image */}
                        <div className="mb-2 h-[300px] w-full max-w-[600px] bg-grey-300 bg-cover bg-no-repeat"></div>
                        <div className="w-full max-w-[600px] pb-[30px] text-center text-[1.3rem] text-grey-600">Feature image caption</div>

                        <div className="max-w-[600px] border-b border-grey-200 py-5 text-[1.6rem] leading-[1.7] text-black">
                            <p className="mb-5">This is what your content will look like when you send one of your posts as an email newsletter to your subscribers.</p>
                            <p className="mb-5">Over there on the left you’ll see some settings that allow you to customize the look and feel of this template to make it perfectly suited to your brand. Email templates are exceptionally finnicky to make, but we’ve spent a long time optimising this one to make it work beautifully across devices, email clients and content types.</p>
                            <p className="mb-5">So, you can trust that every email you send with Ghost will look great and work well. Just like the rest of your site.</p>
                        </div>

                        {/* Feedback */}
                        <div className="grid gap-5 border-b border-grey-200 px-6 py-5">
                            <div className="flex justify-center gap-3">
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
                                <button className="pointer-events-none cursor-default whitespace-nowrap rounded-[2.2rem] bg-transparent font-semibold" type="button">
                                    <span className="inline-flex items-center gap-2 px-[18px] py-[7px]">
                                        <Icon name="comment" />
                                        <span>Comment</span>
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Latest posts */}
                        <div className="border-b border-grey-200 py-6">
                            <h3 className="mb-4 mt-2 pb-1 text-[1.4rem] font-semibold uppercase">Keep reading</h3>
                            <div className="flex justify-between gap-4 py-2">
                                <div>
                                    <h4 className="mb-1 mt-0.5 text-[1.9rem]">The three latest posts published on your site</h4>
                                    <p className="m-0 text-base text-grey-600">Posts sent as an email only will never be shown here.</p>
                                </div>
                                <div className="aspect-square h-auto w-full max-w-[100px] bg-grey-200 bg-cover bg-no-repeat" style={{backgroundImage: 'url(\'/../../../../admin-x-ds/assets/images/latest-posts-1.png'}}></div>
                            </div>
                            <div className="flex justify-between gap-4 py-2">
                                <div>
                                    <h4 className="mb-1 mt-0.5 text-[1.9rem]">Displayed at the bottom of each newsletter</h4>
                                    <p className="m-0 text-base text-grey-600">Giving your readers one more place to discover your stories.</p>
                                </div>
                                <div className="aspect-square h-auto w-full max-w-[100px] bg-grey-200 bg-cover bg-no-repeat"></div>
                            </div>
                            <div className="flex justify-between gap-4 py-2">
                                <div>
                                    <h4 className="mb-1 mt-0.5 text-[1.9rem]">To keep your work front and center</h4>
                                    <p className="m-0 text-base text-grey-600">Making sure that your audience stays engaged.</p>
                                </div>
                                <div className="aspect-square h-auto w-full max-w-[100px] bg-grey-200 bg-cover bg-no-repeat"></div>
                            </div>
                        </div>

                        {/* Subscription details */}
                        <div className="border-b border-grey-200 py-8">
                            <h4 className="mb-3 text-[1.4rem] uppercase">Subscription details</h4>
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

                        {/* Footer */}
                        <div className="flex flex-col items-center pt-10">
                            <div className="text break-words px-8 py-3 text-center text-[1.3rem] leading-base text-grey-600">This is custom email footer text.</div>

                            <div className="px-8 pb-14 pt-3 text-center text-[1.3rem] text-grey-600">
                                <span>Ghosty © 2023 – </span>
                                <span className="pointer-events-none cursor-auto underline">Unsubscribe</span>
                            </div>

                            <div className="flex flex-col items-center pb-[40px] pt-[10px]">
                                <a className="pointer-events-none inline-flex cursor-auto items-center px-2 py-1 text-[1.25rem] font-semibold tracking-tight text-grey-900" href="#">
                                    <GhostOrb className="mr-[6px] h-4 w-4"/>
                                    <span>Powered by Ghost</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsletterPreview;