import React from 'react';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, EmptyIndicator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger} from '@tryghost/shade/components';
import {CommentsOverviewTopMember} from '@tryghost/admin-x-framework/api/stats';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {getPeriodText} from '../utils/period-text';

interface OverviewTopMembersProps {
    members: CommentsOverviewTopMember[] | undefined;
    range: number;
    isLoading: boolean;
    onRowClick: (memberId: string) => void;
}

const PREVIEW_LIMIT = 5;

const renderRows = (members: CommentsOverviewTopMember[], onRowClick: (memberId: string) => void) => (
    <ul className='divide-y'>
        {members.map(member => (
            <li key={member.id}>
                <button
                    className='flex w-full items-center justify-between gap-4 py-2.5 text-left transition-colors hover:bg-muted/50'
                    type='button'
                    onClick={() => onRowClick(member.id)}
                >
                    <span className='line-clamp-1 flex-1 text-sm'>{member.name || member.email}</span>
                    <span className='font-mono text-sm'>{formatNumber(member.count)}</span>
                </button>
            </li>
        ))}
    </ul>
);

const OverviewTopMembers: React.FC<OverviewTopMembersProps> = ({members, range, isLoading, onRowClick}) => {
    const hasData = members && members.length > 0;
    const previewMembers = members ? members.slice(0, PREVIEW_LIMIT) : [];
    const canViewAll = members ? members.length > PREVIEW_LIMIT : false;

    return (
        <Card data-testid='comments-overview-top-members'>
            <CardHeader>
                <CardTitle>Top commenters</CardTitle>
                <CardDescription>Members who commented most {getPeriodText(range)}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className='text-sm text-muted-foreground'>Loading…</div>
                ) : !hasData ? (
                    <EmptyIndicator title='No commenters in this period'>
                        <LucideIcon.Users />
                    </EmptyIndicator>
                ) : (
                    renderRows(previewMembers, onRowClick)
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
                                <SheetTitle>Top commenters</SheetTitle>
                                <SheetDescription>Members who commented most {getPeriodText(range)}</SheetDescription>
                            </SheetHeader>
                            <div className='group/datalist'>
                                {renderRows(members!, onRowClick)}
                            </div>
                        </SheetContent>
                    </Sheet>
                </CardFooter>
            )}
        </Card>
    );
};

export default OverviewTopMembers;
