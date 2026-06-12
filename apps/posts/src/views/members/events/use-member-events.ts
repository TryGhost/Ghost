import {buildEventsPageFilter, buildMembersEventFilter, formatEventCursor, getNextEventsPageParams} from './member-event-filter';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseMemberEventsInfinite} from '@tryghost/admin-x-framework/api/members';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useMemo, useState} from 'react';
import type {ParseEventContext} from './parse-member-event';

/**
 * Settings flags shared by the activity surfaces. Everything stays undefined
 * until the settings query resolves so callers can gate their requests.
 */
export function useActivitySettings() {
    const {data: settingsData} = useBrowseSettings();
    const settings = settingsData?.settings ?? null;

    return {
        settingsLoaded: Boolean(settings),
        emailDisabled: getSettingValue<string>(settings, 'editor_default_email_recipients') === 'disabled',
        commentsDisabled: getSettingValue<string>(settings, 'comments_enabled') === 'off',
        emailTrackClicks: getSettingValue<boolean>(settings, 'email_track_clicks') === true,
        paidMembersEnabled: getSettingValue<boolean>(settings, 'paid_members_enabled') === true
    };
}

/**
 * Cursor-paginated member events. Mirrors the Ember members-event-fetcher:
 * the first page is anchored to "now" and every next page filters on the
 * created_at of the last event seen.
 */
export function useMemberEvents({memberId, excludedEvents = [], pageSize, enabled = true}: {
    memberId?: string;
    excludedEvents?: string[];
    pageSize: number;
    enabled?: boolean;
}) {
    const {settingsLoaded, emailDisabled, commentsDisabled} = useActivitySettings();

    // Anchor the cursor once per mount so re-renders don't change the query key
    const [initialCursor] = useState(() => formatEventCursor(new Date()));

    const searchParams = useMemo(() => {
        const baseFilter = buildMembersEventFilter({
            excludedEvents,
            member: memberId,
            settings: {emailDisabled, commentsDisabled}
        });

        return {
            limit: String(pageSize),
            filter: buildEventsPageFilter(initialCursor, baseFilter)
        };
        // the array's contents (not its identity) determine the filter
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [excludedEvents.join(','), memberId, emailDisabled, commentsDisabled, pageSize, initialCursor]);

    const query = useBrowseMemberEventsInfinite({
        searchParams,
        enabled: settingsLoaded && enabled,
        getNextPageParams: getNextEventsPageParams
    });

    return {
        events: query.data?.events ?? [],
        isLoading: query.isLoading && settingsLoaded && enabled,
        isFetchingNextPage: query.isFetchingNextPage,
        hasNextPage: query.hasNextPage ?? false,
        fetchNextPage: query.fetchNextPage
    };
}

/**
 * Context needed by parseMemberEvent: whether there are multiple newsletters
 * (to name them in actions) and multiple paid tiers (to name them in info).
 */
export function useParseEventContext(): ParseEventContext {
    const {paidMembersEnabled} = useActivitySettings();

    const {data: newslettersData} = useBrowseNewsletters({
        searchParams: {filter: 'status:active', include: 'none', limit: '1'}
    });
    const {data: tiersData} = useBrowseTiers({
        searchParams: {filter: 'type:paid+active:true', limit: '1'}
    });

    const newsletterCount = newslettersData?.meta?.pagination.total;
    const tierCount = tiersData?.meta?.pagination.total;

    return {
        // unknown counts default to true, which harms the least (matches Ember)
        hasMultipleNewsletters: newsletterCount === undefined ? true : newsletterCount > 1,
        hasMultipleTiers: paidMembersEnabled && (tierCount ?? 0) > 1,
        paidMembersEnabled
    };
}
