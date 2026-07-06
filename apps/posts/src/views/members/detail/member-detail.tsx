import MainLayout from '@components/layout/main-layout';
import MemberDetailSidebar from './member-detail-sidebar';
import React from 'react';
import {Button, Skeleton} from '@tryghost/shade/components';
import {Link, useLocation, useParams} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import {deriveMemberDetailBackPath} from './member-detail-nav';
import {formatMemberName} from '@tryghost/shade/app';
import {getMember} from '@tryghost/admin-x-framework/api/members';

const MemberDetail: React.FC = () => {
    const {member_id: memberId = ''} = useParams<{member_id: string}>();
    const location = useLocation();
    const backPath = deriveMemberDetailBackPath(location.search);

    // `include=tiers` mirrors the Ember route so complimentary tiers arrive with the member.
    const {data, isLoading} = getMember(memberId, {
        enabled: !!memberId,
        searchParams: {include: 'tiers'},
        defaultErrorHandler: false
    });
    const member = data?.members?.[0];
    const notFound = !isLoading && !member;

    return (
        <MainLayout>
            <div className='flex h-full flex-col' data-testid='member-detail'>
                <header className='flex h-14 shrink-0 items-center gap-3 border-b border-border px-2'>
                    <Button aria-label='Back to members' variant='ghost' asChild>
                        <Link data-test-link='members-back' to={backPath}>
                            <LucideIcon.ArrowLeft strokeWidth={2} />
                        </Link>
                    </Button>
                    {isLoading ? (
                        <Skeleton className='h-6 w-48' />
                    ) : (
                        <h1 className='min-w-0 flex-1 truncate text-xl font-semibold tracking-tight' data-testid='member-detail-title'>
                            {member ? formatMemberName(member) : 'Member not found'}
                        </h1>
                    )}
                </header>

                {notFound && (
                    <div className='flex flex-1 items-center justify-center'>
                        <p className='text-muted-foreground'>This member couldn’t be found.</p>
                    </div>
                )}

                {member && (
                    <div className='flex flex-1 flex-col gap-8 overflow-y-auto p-6 lg:flex-row-reverse lg:items-start'>
                        <MemberDetailSidebar member={member} />
                        {/* Main column (fields, subscriptions, newsletters, activity) arrives in later slices. */}
                        <div className='min-w-0 flex-1' />
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default MemberDetail;
