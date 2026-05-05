import MainLayout from '@components/layout/main-layout';
import React from 'react';

interface CommentsLayoutProps {
    children: React.ReactNode;
    /**
     * Optional right-side column rendered alongside the main content on `lg+`.
     * On smaller viewports it collapses above the main column so the analytics
     * overview still appears at the top of the page.
     */
    rail?: React.ReactNode;
}

const CommentsLayout: React.FC<CommentsLayoutProps> = ({children, rail}) => {
    const body = rail ? (
        <div className='block grow lg:grid lg:grid-cols-[minmax(0,1fr)_460px]'>
            {/* `self-start` is required for sticky — grid cells otherwise stretch to the row's height. */}
            <aside className='px-4 pt-4 lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:max-h-screen lg:self-start lg:overflow-y-auto lg:border-l lg:border-border lg:px-8 lg:pt-8'>
                {rail}
            </aside>
            <div className='flex min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:[&_.prose]:max-w-[70ch]'>
                {children}
            </div>
        </div>
    ) : children;

    return (
        <MainLayout>
            <div className='grid w-full grow'>
                <div className='flex h-full flex-col' data-testid='comments-page'>
                    {body}
                </div>
            </div>
        </MainLayout>
    );
};

export default CommentsLayout;
