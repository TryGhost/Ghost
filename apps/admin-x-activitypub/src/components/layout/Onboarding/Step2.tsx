import Header from './components/Header';
import React, {ReactNode} from 'react';
import {Avatar, AvatarFallback, AvatarImage, Button, LucideIcon, Separator} from '@tryghost/shade';

const Reply: React.FC<{
    avatarNo: number,
    name: string,
    handle: string,
    timestamp: string,
    children?: ReactNode
}> = ({avatarNo, name, handle, timestamp, children}) => {
    return (
        <div>
            <div className='flex w-full items-start gap-3'>
                <Avatar className='z-50 h-9 w-9 border border-white'>
                    <AvatarImage src={`https://i.pravatar.cc/150?img=${avatarNo}`} />
                    <AvatarFallback className='bg-yellow font-semibold text-white'>CN</AvatarFallback>
                </Avatar>
                <div className='flex flex-col gap-2 text-sm'>
                    <div className='mt-0.5 flex flex-col gap-0.5'>
                        <div className='font-semibold leading-tighter'>{name} <span className='font-normal text-gray-700'>{handle}</span></div>
                        <div className='flex items-center gap-1 leading-tighter text-gray-700'>
                            <LucideIcon.Reply size={14} strokeWidth={1.5} />
                            <span>Replied to your post {timestamp}</span>
                        </div>
                    </div>
                    <div className='text-md'>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Reaction: React.FC<{
    type: 'like' | 'repost',
    names: string,
    timestamp: string,
    children?: ReactNode
}> = ({type, names, timestamp, children}) => {
    return (
        <div>
            <div className='flex w-full items-start gap-3'>
                <div className={`flex h-9 max-h-9 min-h-9 w-9 min-w-9 max-w-9 items-center justify-center rounded-full bg-gradient-to-t  text-white ${type === 'like' ? 'from-pink-400 to-pink-600' : 'from-blue-400 to-blue-600'}`}>
                    {type === 'like' ? <LucideIcon.Heart size={20} /> : <LucideIcon.Repeat size={20} />}
                </div>
                <div className='flex flex-col gap-2 text-sm'>
                    <div className='flex flex-col gap-3'>
                        {children}
                        <div className='flex flex-col gap-0.5'>
                            <div className='font-semibold leading-tighter'>{names} <span className='font-normal text-gray-700'>{type === 'like' ? 'liked' : 'reposted'} your post</span></div>
                            <div className='text-xs text-gray-700'>{timestamp}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Step2: React.FC<{onNext: () => void}> = ({onNext}) => {
    // TODO: add overflow-hidden
    return (
        <div className='flex h-full max-h-screen w-full flex-col gap-4'>
            <Header>
                <div className='flex flex-col justify-between gap-4 text-xl font-medium'>
                    <h1 className='max-w-[680px]'>Feel the network effect.</h1>
                    <div className='flex max-w-[680px] flex-col gap-4'>
                        <p className='tracking-tight text-gray-700 dark:text-gray-600'>People who follow you can like, reply, repost and interact with your posts. Their followers will see those interactions too, distributing your content even more widely, to a brand new audience.</p>
                        <p className='tracking-tight text-gray-700 dark:text-gray-600'>Best of all, you get realtime feedback and visibility when something you’ve created is spreading fast across the social web.</p>
                    </div>
                </div>
                <Button className='min-w-60 bg-gradient-to-r from-purple-500 to-purple-600' size='lg' onClick={onNext}>Next &rarr;</Button>
            </Header>
            <div className='mt-8 flex h-full max-h-[670px] flex-col items-stretch justify-end'>
                <div className='relative -mx-14 mt-5 w-[calc(100%+112px)] overflow-y-hidden px-14'>
                    <div className='mx-auto h-[694px] w-full max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl'>
                        <div className='flex h-full flex-col items-stretch gap-6 p-8'>
                            <Reply avatarNo={40} handle='@conan@obrian.com' name='Conan OBrian' timestamp='just now'>
                                Do you see any Teletubbies in here? Do you see a slender plastic tag clipped to my shirt with my name printed on it?
                            </Reply>
                            <Separator />
                            <Reaction names='Ryan Reynolds and 2 others' timestamp='Just now' type='like'>
                                <div className='isolate flex items-center'>
                                    <Avatar className='z-30 h-9 w-9 border border-white'>
                                        <AvatarImage src='' />
                                        <AvatarFallback className='bg-[#BAB890] font-semibold text-white'>RR</AvatarFallback>
                                    </Avatar>
                                    <Avatar className='z-20 -ml-3 h-9 w-9 border border-white'>
                                        <AvatarImage src='https://i.pravatar.cc/150?img=1' />
                                        <AvatarFallback className='bg-green-400 text-white'>WA</AvatarFallback>
                                    </Avatar>
                                    <Avatar className='z-10 -ml-3 h-9 w-9 border border-white'>
                                        <AvatarImage src='https://i.pravatar.cc/150?img=10' />
                                        <AvatarFallback className='bg-blue text-white'>FR</AvatarFallback>
                                    </Avatar>
                                </div>
                            </Reaction>
                            <Separator />
                            <Reply avatarNo={41} handle='@jimmy@jimmyfallon.com' name='Jimmy Fallon' timestamp='2 hours ago'>
                                Well I can’t blame him! I mean if you release a casette you’d better give your followers something to play it on, right? 😎
                            </Reply>
                            <Separator />
                            <Reaction names='Snoop Dogg and 4 others' timestamp='Yesterday' type='repost'>
                                <div className='isolate flex items-center'>
                                    <Avatar className='z-50 h-9 w-9 border border-white'>
                                        <AvatarImage src='https://i.pravatar.cc/150?img=3' />
                                        <AvatarFallback className='bg-yellow font-semibold text-white'>CN</AvatarFallback>
                                    </Avatar>
                                    <Avatar className='z-40 -ml-3 h-9 w-9 border border-white'>
                                        <AvatarImage src='' />
                                        <AvatarFallback className='bg-yellow text-white'>CN</AvatarFallback>
                                    </Avatar>
                                    <Avatar className='z-30 -ml-3 h-9 w-9 border border-white'>
                                        <AvatarImage src='https://i.pravatar.cc/150?img=4' />
                                        <AvatarFallback className='bg-yellow text-white'>CN</AvatarFallback>
                                    </Avatar>
                                    <Avatar className='z-20 -ml-3 h-9 w-9 border border-white'>
                                        <AvatarImage src='https://i.pravatar.cc/150?img=5' />
                                        <AvatarFallback className='bg-green-400 text-white'>WA</AvatarFallback>
                                    </Avatar>
                                    <Avatar className='z-10 -ml-3 h-9 w-9 border border-white'>
                                        <AvatarImage src='' />
                                        <AvatarFallback className='bg-blue text-white'>FR</AvatarFallback>
                                    </Avatar>
                                </div>
                            </Reaction>
                            <Separator />
                            <Reaction names='Holly Flax and Michael Scott' timestamp='Yesterday' type='like'>
                                <div className='isolate flex items-center'>
                                    <Avatar className='z-20 h-9 w-9 border border-white'>
                                        <AvatarImage src='https://i.pravatar.cc/150?img=8' />
                                        <AvatarFallback className='bg-green-400 text-white'>WA</AvatarFallback>
                                    </Avatar>
                                    <Avatar className='z-10 -ml-3 h-9 w-9 border border-white'>
                                        <AvatarImage src='https://i.pravatar.cc/150?img=20' />
                                        <AvatarFallback className='bg-blue text-white'>FR</AvatarFallback>
                                    </Avatar>
                                </div>
                            </Reaction>
                        </div>
                    </div>
                    <div className='absolute inset-x-0 bottom-0 h-[192px] bg-gradient-to-t from-white via-[rgba(255,255,255,0.71)] to-[rgba(255,255,255,0)]'></div>
                </div>
            </div>
        </div>
    );
};

export default Step2;
