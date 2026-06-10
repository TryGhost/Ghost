import LoadMoreButton from '@components/virtual-table/load-more-button';
import MainLayout from '@components/layout/main-layout';
import React from 'react';
import {ActivityTable} from './components/activity-table';
import {EventTypeFilter} from './components/event-type-filter';
import {Link, Navigate, useSearchParams} from '@tryghost/admin-x-framework';
import {LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {MemberContextCard} from './components/member-context-card';
import {canManageMembers} from '@tryghost/admin-x-framework/api/users';
import {getHiddenActivityEvents} from '../events/member-event-types';
import {getMember} from '@tryghost/admin-x-framework/api/members';
import {useActivitySettings, useMemberEvents, useParseEventContext} from '../events/use-member-events';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';

function NoEvents({hasFilter}: {hasFilter: boolean}) {
    return (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
            {hasFilter ? (
                <>
                    <h4 className="font-semibold">No activities match the current filter</h4>
                    <Link className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent" to="/members-activity">
                        Show all activity
                    </Link>
                </>
            ) : (
                <h4 className="font-semibold">No member activity yet</h4>
            )}
        </div>
    );
}

const MembersActivity: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const memberId = searchParams.get('member') ?? '';
    const excludedEvents = searchParams.get('excludedEvents') ?? '';

    const {data: currentUser, isLoading: isUserLoading} = useCurrentUser();
    const {settingsLoaded, emailDisabled, commentsDisabled, emailTrackClicks} = useActivitySettings();
    const parseContext = useParseEventContext();

    const hiddenEvents = getHiddenActivityEvents({
        hasMemberFilter: Boolean(memberId),
        emailDisabled
    });
    const fullExcludedEvents = [
        ...excludedEvents.split(',').filter(Boolean),
        ...hiddenEvents
    ];

    const {events, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useMemberEvents({
        memberId: memberId || undefined,
        excludedEvents: fullExcludedEvents,
        pageSize: 50
    });

    const {data: memberData} = getMember(memberId, {
        enabled: Boolean(memberId),
        defaultErrorHandler: false
    });
    const memberRecord = memberId ? memberData?.members?.[0] : undefined;

    if (isUserLoading || !currentUser) {
        return null;
    }

    if (!canManageMembers(currentUser)) {
        return <Navigate to="/" replace />;
    }

    const handleChangeExcludedEvents = (newExcludedEvents: string) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (newExcludedEvents) {
                next.set('excludedEvents', newExcludedEvents);
            } else {
                next.delete('excludedEvents');
            }
            return next;
        });
    };

    return (
        <MainLayout data-testid="members-activity-page">
            <div className="w-full overflow-y-auto">
                <div className="mx-auto w-full max-w-6xl px-6 py-8">
                    <header className="mb-6 flex items-center justify-between gap-4">
                        {memberRecord ? (
                            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-base" data-testid="members-activity-breadcrumb">
                                <Link
                                    className="font-semibold text-muted-foreground hover:text-foreground"
                                    data-testid="members-activity-back"
                                    to="/members-activity"
                                >
                                    Member activity
                                </Link>
                                <LucideIcon.ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                                <span className="truncate font-semibold">{memberRecord.name || memberRecord.email}</span>
                            </nav>
                        ) : (
                            <h2 className="text-2xl font-bold" data-testid="members-activity-title">
                                Member activity
                            </h2>
                        )}

                        <div className="flex shrink-0 items-center gap-2">
                            <EventTypeFilter
                                excludedEvents={excludedEvents}
                                hiddenEvents={hiddenEvents}
                                settings={{commentsEnabled: !commentsDisabled, emailTrackClicks}}
                                onChange={handleChangeExcludedEvents}
                            />
                        </div>
                    </header>

                    {memberRecord && <MemberContextCard member={memberRecord} />}

                    {events.length > 0 ? (
                        <>
                            <ActivityTable
                                events={events}
                                hideMemberColumn={Boolean(memberId)}
                                parseContext={parseContext}
                            />
                            {hasNextPage && (
                                <LoadMoreButton
                                    isLoading={isFetchingNextPage}
                                    onClick={() => fetchNextPage()}
                                />
                            )}
                        </>
                    ) : (isLoading || !settingsLoaded) ? (
                        <div className="flex justify-center py-20">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : (
                        <NoEvents hasFilter={Boolean(memberId || excludedEvents)} />
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default MembersActivity;
