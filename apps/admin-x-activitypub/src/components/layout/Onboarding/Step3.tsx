import Header from './components/Header';
import React, {ReactNode} from 'react';
import {Button, H1, LucideIcon} from '@tryghost/shade';

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

const Step3: React.FC<{onComplete: () => Promise<void>}> = ({onComplete}) => (
    <div className='flex h-full w-full flex-col gap-4'>
        <Header>
            <H1>Find inspiration & follow what you love.</H1>
            <Button onClick={onComplete}>Done</Button>
        </Header>
        <div className='h-full'>
            <div>
                tabs
            </div>
            Fake UI --
            <div className='relative w-full overflow-hidden'>
                <div className='mx-auto mt-10 h-[694px] w-full max-w-6xl overflow-hidden rounded-md bg-white shadow-xl'>
                    <div className='flex h-5 w-full items-center gap-1.5 bg-gray-100 pl-2'>
                        <div className='h-2 w-2 rounded-full bg-gray-300'></div>
                        <div className='h-2 w-2 rounded-full bg-gray-300'></div>
                        <div className='h-2 w-2 rounded-full bg-gray-300'></div>
                    </div>
                    <div className='h-full px-6'>
                        <div className='flex w-full justify-between border-b border-gray-200 py-5'>
                            <H1>Inbox</H1>
                            <div className='flex h-[30px] w-[232px] items-center rounded-full bg-gray-100 px-2 text-gray-400'>
                                <LucideIcon.Search size={16} strokeWidth={1.5} />
                            </div>
                        </div>
                        <div className='grid h-full grid-cols-[auto_248px] gap-4'>
                            <div>
                                content
                            </div>
                            <div className='flex h-full flex-col gap-px border-l border-gray-200 pl-4 pt-4'>
                                <MenuItem selected>
                                    <LucideIcon.Inbox size={16} strokeWidth={1.5} />
                                    Inbox
                                </MenuItem>
                                <MenuItem>
                                    <LucideIcon.Hash size={16} strokeWidth={1.5} />
                                    Feed
                                </MenuItem>
                                <MenuItem>
                                    <LucideIcon.Bell size={16} strokeWidth={1.5} />
                                    Notifications
                                </MenuItem>
                                <MenuItem>
                                    <LucideIcon.Globe size={16} strokeWidth={1.5} />
                                    Explore
                                </MenuItem>
                                <MenuItem>
                                    <LucideIcon.User size={16} strokeWidth={1.5} />
                                    Profile
                                </MenuItem>
                                <div className='mt-8'>
                                    <div className='inline-flex h-8 items-center gap-1.5 rounded-full bg-purple-500 pl-2 pr-3 text-sm font-medium text-white'>
                                        <LucideIcon.FilePen size={16} strokeWidth={1.5} />
                                    New note
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='absolute inset-x-0 bottom-0 h-[192px] bg-gradient-to-t from-white via-[rgba(255,255,255,0.71)] to-[rgba(255,255,255,0)]'></div>
            </div>
        </div>
    </div>
);

export default Step3;
