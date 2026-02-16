import {Post} from '@tryghost/admin-x-framework/api/posts';

export interface CalendarMonth {
    year: number;
    month: number;
}

export type CalendarPostStatus = 'draft' | 'scheduled' | 'published' | 'unknown';
export type CalendarPostOrder = 'published_at asc' | 'published_at desc' | 'updated_at desc';

export interface CalendarPost {
    id: string;
    title: string;
    occursAt: string;
    status: CalendarPostStatus;
    updatedAt?: string;
}

export interface CalendarDay {
    dateKey: string;
    dayNumber: number;
    inCurrentMonth: boolean;
    posts: CalendarPost[];
}

const CALENDAR_DAY_COUNT = 42;

const pad = (value: number) => value.toString().padStart(2, '0');

const normalizeMonth = (year: number, month: number): CalendarMonth => {
    const normalizedYear = year + Math.floor((month - 1) / 12);
    const normalizedMonth = ((month - 1) % 12 + 12) % 12 + 1;

    return {
        year: normalizedYear,
        month: normalizedMonth
    };
};

const getDatePartsInTimezone = (date: Date, timeZone: string) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);

    const year = Number(parts.find(part => part.type === 'year')?.value ?? 0);
    const month = Number(parts.find(part => part.type === 'month')?.value ?? 1);
    const day = Number(parts.find(part => part.type === 'day')?.value ?? 1);

    return {year, month, day};
};

export const getDateKeyInTimezone = (dateInput: string, timeZone: string) => {
    const date = new Date(dateInput);
    const {year, month, day} = getDatePartsInTimezone(date, timeZone);

    return `${year}-${pad(month)}-${pad(day)}`;
};

export const getNowMonthInTimezone = (timeZone: string, now = new Date()): CalendarMonth => {
    const {year, month} = getDatePartsInTimezone(now, timeZone);

    return {year, month};
};

export const shiftCalendarMonth = (month: CalendarMonth, offset: number): CalendarMonth => {
    return normalizeMonth(month.year, month.month + offset);
};

const getTimestamp = (value?: string) => {
    if (!value) {
        return 0;
    }

    return new Date(value).getTime();
};

const sortCalendarPosts = (posts: CalendarPost[], order: CalendarPostOrder): CalendarPost[] => {
    return posts.sort((a, b) => {
        if (order === 'updated_at desc') {
            const aUpdatedAt = getTimestamp(a.updatedAt || a.occursAt);
            const bUpdatedAt = getTimestamp(b.updatedAt || b.occursAt);

            return bUpdatedAt - aUpdatedAt;
        }

        if (order === 'published_at asc') {
            return getTimestamp(a.occursAt) - getTimestamp(b.occursAt);
        }

        return getTimestamp(b.occursAt) - getTimestamp(a.occursAt);
    });
};

const mapPostsByDay = (posts: Post[], timeZone: string, order: CalendarPostOrder): Map<string, CalendarPost[]> => {
    const postsByDay = new Map<string, CalendarPost[]>();

    const mappedPosts: Array<CalendarPost | null> = posts.map((post) => {
        const status = getPostStatus(post.status);
        const occursAt = getPostOccurrenceDate(post, status);

        if (!occursAt) {
            return null;
        }

        const calendarPost: CalendarPost = {
            id: post.id,
            title: post.title,
            occursAt,
            status
        };

        if (post.updated_at) {
            calendarPost.updatedAt = post.updated_at;
        }

        return calendarPost;
    });

    const items = sortCalendarPosts(mappedPosts
        .filter((post): post is CalendarPost => Boolean(post)), order);

    for (const post of items) {
        const key = getDateKeyInTimezone(post.occursAt, timeZone);
        const existingItems = postsByDay.get(key) ?? [];
        existingItems.push(post);
        postsByDay.set(key, existingItems);
    }

    return postsByDay;
};

const getPostStatus = (status?: string): CalendarPostStatus => {
    if (status === 'draft' || status === 'scheduled' || status === 'published') {
        return status;
    }

    return 'unknown';
};

const getPostOccurrenceDate = (post: Post, status: CalendarPostStatus): string | undefined => {
    if (status === 'draft') {
        return post.updated_at || post.created_at || post.published_at;
    }

    return post.published_at || post.updated_at || post.created_at;
};

interface BuildCalendarGridArgs {
    month: CalendarMonth;
    posts: Post[];
    timeZone: string;
    order?: CalendarPostOrder;
}

export const buildCalendarGrid = ({month, posts, timeZone, order = 'published_at desc'}: BuildCalendarGridArgs): CalendarDay[] => {
    const firstDayOfMonth = new Date(Date.UTC(month.year, month.month - 1, 1));
    const firstDayOffset = firstDayOfMonth.getUTCDay();
    const daysInCurrentMonth = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
    const daysInPreviousMonth = new Date(Date.UTC(month.year, month.month - 1, 0)).getUTCDate();
    const postsByDay = mapPostsByDay(posts, timeZone, order);
    const days: CalendarDay[] = [];

    for (let i = 0; i < CALENDAR_DAY_COUNT; i += 1) {
        let dayNumber = 0;
        let dateMonth = month;
        let inCurrentMonth = true;

        if (i < firstDayOffset) {
            dayNumber = daysInPreviousMonth - firstDayOffset + i + 1;
            dateMonth = shiftCalendarMonth(month, -1);
            inCurrentMonth = false;
        } else if (i < firstDayOffset + daysInCurrentMonth) {
            dayNumber = i - firstDayOffset + 1;
        } else {
            dayNumber = i - (firstDayOffset + daysInCurrentMonth) + 1;
            dateMonth = shiftCalendarMonth(month, 1);
            inCurrentMonth = false;
        }

        const dateKey = `${dateMonth.year}-${pad(dateMonth.month)}-${pad(dayNumber)}`;

        days.push({
            dateKey,
            dayNumber,
            inCurrentMonth,
            posts: postsByDay.get(dateKey) ?? []
        });
    }

    return days;
};

export const formatMonthLabel = (month: CalendarMonth) => {
    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
};

export const formatPostTime = (dateInput: string, timeZone: string) => {
    return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit'
    }).format(new Date(dateInput));
};
