import MainLayout from '@components/layout/main-layout';
import React, {useMemo, useState} from 'react';
import {buildCalendarGrid, formatMonthLabel, formatPostTime, getNowMonthInTimezone, shiftCalendarMonth} from './utils/calendar';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {Button, EmptyIndicator, Header, LoadingIndicator, LucideIcon, cn} from '@tryghost/shade';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_POSTS_PER_DAY = 3;

const ContentCalendar: React.FC = () => {
    const settings = useBrowseSettings();
    const siteTimezone = useMemo(() => getSiteTimezone(settings.data?.settings ?? []), [settings.data?.settings]);
    const [monthOffset, setMonthOffset] = useState(0);
    const month = useMemo(() => shiftCalendarMonth(getNowMonthInTimezone(siteTimezone), monthOffset), [siteTimezone, monthOffset]);
    const monthLabel = useMemo(() => formatMonthLabel(month), [month]);

    const {data, isError, isLoading} = useBrowsePosts({
        searchParams: {
            filter: 'status:scheduled',
            limit: 'all'
        }
    });

    const posts = data?.posts ?? [];
    const calendarDays = useMemo(() => buildCalendarGrid({
        month,
        posts,
        timeZone: siteTimezone
    }), [month, posts, siteTimezone]);

    const monthPostCount = useMemo(() => calendarDays.reduce((count, day) => {
        if (!day.inCurrentMonth) {
            return count;
        }

        return count + day.posts.length;
    }, 0), [calendarDays]);

    return (
        <MainLayout>
            <div className="grid w-full grow">
                <div className="flex h-full flex-col" data-testid="content-calendar-page">
                    <Header className="relative !pb-6 md:sticky" variant="inline-nav">
                        <Header.Title>Content calendar</Header.Title>
                        <Header.Meta>
                            {monthPostCount} scheduled {monthPostCount === 1 ? 'post' : 'posts'} in {monthLabel} ({siteTimezone})
                        </Header.Meta>
                        <Header.Actions>
                            <Header.ActionGroup>
                                <Button
                                    aria-label="Show previous month"
                                    variant="outline"
                                    onClick={() => setMonthOffset(offset => offset - 1)}
                                >
                                    <LucideIcon.ChevronLeft className="size-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setMonthOffset(0)}
                                >
                                    Today
                                </Button>
                                <Button
                                    aria-label="Show next month"
                                    variant="outline"
                                    onClick={() => setMonthOffset(offset => offset + 1)}
                                >
                                    <LucideIcon.ChevronRight className="size-4" />
                                </Button>
                            </Header.ActionGroup>
                            <Header.ActionGroup>
                                <Button asChild>
                                    <a href="#/editor/post">New post</a>
                                </Button>
                            </Header.ActionGroup>
                        </Header.Actions>
                    </Header>
                    <div className="px-4 pb-8 lg:px-8">
                        {isLoading ? (
                            <div className="flex min-h-[400px] items-center justify-center">
                                <LoadingIndicator size="lg" />
                            </div>
                        ) : isError ? (
                            <div className="mb-16 flex min-h-[400px] flex-col items-center justify-center">
                                <h2 className="mb-2 text-xl font-medium">Error loading calendar</h2>
                                <p className="mb-4 text-muted-foreground">Please reload the page to try again.</p>
                                <Button onClick={() => window.location.reload()}>
                                    Reload page
                                </Button>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="flex min-h-[400px] items-center justify-center">
                                <EmptyIndicator
                                    actions={(
                                        <Button asChild>
                                            <a href="#/editor/post">Create a post</a>
                                        </Button>
                                    )}
                                    title="No scheduled posts yet"
                                >
                                    <LucideIcon.CalendarDays />
                                </EmptyIndicator>
                            </div>
                        ) : (
                            <div className="overflow-x-auto pb-2">
                                <div className="min-w-[960px]">
                                    <div className="mb-2 grid grid-cols-7 gap-2">
                                        {WEEKDAYS.map(day => (
                                            <div key={day} className="rounded-md px-2 py-1 text-xs font-medium uppercase text-muted-foreground">
                                                {day}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                        {calendarDays.map(day => {
                                            const visiblePosts = day.posts.slice(0, MAX_POSTS_PER_DAY);
                                            const hiddenPostCount = day.posts.length - visiblePosts.length;

                                            return (
                                                <div
                                                    key={day.dateKey}
                                                    className={cn(
                                                        'min-h-[180px] rounded-xl border border-border bg-card p-2',
                                                        !day.inCurrentMonth && 'bg-muted/35 text-muted-foreground'
                                                    )}
                                                >
                                                    <div className="text-sm font-medium">{day.dayNumber}</div>
                                                    {visiblePosts.length > 0 && (
                                                        <ul className="mt-2 space-y-1.5">
                                                            {visiblePosts.map(post => (
                                                                <li key={post.id}>
                                                                    <a
                                                                        className="block rounded-md border border-border bg-background px-2 py-1.5 text-xs hover:border-foreground/30"
                                                                        href={`#/editor/post/${post.id}`}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <span className="line-clamp-2 font-medium">{post.title || 'Untitled post'}</span>
                                                                            <span className="shrink-0 text-muted-foreground">{formatPostTime(post.publishedAt, siteTimezone)}</span>
                                                                        </div>
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {hiddenPostCount > 0 && (
                                                        <div className="mt-2 text-xs text-muted-foreground">
                                                            +{hiddenPostCount} more
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default ContentCalendar;
