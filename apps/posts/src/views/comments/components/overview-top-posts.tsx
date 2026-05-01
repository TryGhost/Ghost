import React from 'react';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, EmptyIndicator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger} from '@tryghost/shade/components';
import {CommentsOverviewTopPost} from '@tryghost/admin-x-framework/api/stats';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {getPeriodText} from '../utils/period-text';

interface OverviewTopPostsProps {
    posts: CommentsOverviewTopPost[] | undefined;
    range: number;
    isLoading: boolean;
    onRowClick: (postId: string) => void;
}

const PREVIEW_LIMIT = 5;

const renderRows = (posts: CommentsOverviewTopPost[], onRowClick: (postId: string) => void) => (
    <ul className='divide-y'>
        {posts.map(post => (
            <li key={post.id}>
                <button
                    className='flex w-full items-center justify-between gap-4 py-2.5 text-left transition-colors hover:bg-muted/50'
                    type='button'
                    onClick={() => onRowClick(post.id)}
                >
                    <span className='line-clamp-1 flex-1 text-sm'>{post.title}</span>
                    <span className='font-mono text-sm'>{formatNumber(post.count)}</span>
                </button>
            </li>
        ))}
    </ul>
);

const OverviewTopPosts: React.FC<OverviewTopPostsProps> = ({posts, range, isLoading, onRowClick}) => {
    const hasData = posts && posts.length > 0;
    const previewPosts = posts ? posts.slice(0, PREVIEW_LIMIT) : [];
    const canViewAll = posts ? posts.length > PREVIEW_LIMIT : false;

    return (
        <Card data-testid='comments-overview-top-posts'>
            <CardHeader>
                <CardTitle>Top posts</CardTitle>
                <CardDescription>Posts with the most comments {getPeriodText(range)}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className='text-sm text-muted-foreground'>Loading…</div>
                ) : !hasData ? (
                    <EmptyIndicator title='No comments in this period'>
                        <LucideIcon.MessageSquare />
                    </EmptyIndicator>
                ) : (
                    renderRows(previewPosts, onRowClick)
                )}
            </CardContent>
            {canViewAll && (
                <CardFooter>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                        </SheetTrigger>
                        <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                            <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 backdrop-blur'>
                                <SheetTitle>Top posts</SheetTitle>
                                <SheetDescription>Posts with the most comments {getPeriodText(range)}</SheetDescription>
                            </SheetHeader>
                            <div className='group/datalist'>
                                {renderRows(posts!, onRowClick)}
                            </div>
                        </SheetContent>
                    </Sheet>
                </CardFooter>
            )}
        </Card>
    );
};

export default OverviewTopPosts;
