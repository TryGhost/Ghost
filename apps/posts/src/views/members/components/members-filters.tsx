import ManageViewPopover from './manage-view-popover';
import React, {useCallback, useMemo} from 'react';
import {Filter, Filters, LucideIcon} from '@tryghost/shade';
import {
    buildOfferOptions,
    fromOfferFilterDisplayValues,
    toOfferFilterDisplayValues,
    useMemberFilterFields
} from '../use-member-filter-fields';
import {escapeNqlString} from '../../filters/filter-normalization';
import {getActiveFilterValues, useFilterSearch} from '@src/hooks/use-filter-search';
import {getLabelBySlug} from '@tryghost/admin-x-framework/api/labels';
import {getNewsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {getPost} from '@tryghost/admin-x-framework/api/posts';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {getTier} from '@tryghost/admin-x-framework/api/tiers';
import {useBrowseLabelsInfinite} from '@tryghost/admin-x-framework/api/labels';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseOffersById, useBrowseOffersInfinite} from '@tryghost/admin-x-framework/api/offers';
import {useBrowsePostsInfinite} from '@tryghost/admin-x-framework/api/posts';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {usePostResourceSearch} from '../hooks/use-post-resource-search';
import type {FilterSearchProps} from '../use-member-filter-fields';
import type {MemberView} from '../hooks/use-member-views';

interface MembersFiltersProps {
    filters: Filter[];
    nql?: string;
    onFiltersChange: (filters: Filter[]) => void;
    savedViews?: MemberView[];
    activeView?: MemberView | null;
}

function toSearchProps(search: {onSearchChange: (s: string) => void; isLoading: boolean}): FilterSearchProps {
    return {
        onSearchChange: search.onSearchChange,
        isLoading: search.isLoading
    };
}

function mapOfferRedemptionFilters(
    filters: Filter[],
    mapValues: (values: string[]) => string[]
) {
    return filters.map((filter) => {
        if (filter.field !== 'offer_redemptions') {
            return filter;
        }

        return {
            ...filter,
            values: mapValues(filter.values as string[])
        };
    });
}

const MembersFilters: React.FC<MembersFiltersProps> = ({
    filters,
    nql,
    onFiltersChange,
    savedViews = [],
    activeView
}) => {
    const activeLabelValues = getActiveFilterValues(filters, 'label');
    const activeTierValues = getActiveFilterValues(filters, 'tier_id');

    const labelSearch = useFilterSearch({
        useQuery: useBrowseLabelsInfinite,
        dataKey: 'labels',
        serverSearchParams: (term): Record<string, string> => (term ? {filter: `name:~${escapeNqlString(term)}`} : {}),
        localSearchFilter: (labels, term) => labels.filter(l => l.name.toLowerCase().includes(term.toLowerCase())),
        toOption: l => ({value: l.slug, label: l.name}),
        useGetById: getLabelBySlug,
        activeValues: activeLabelValues
    });

    const tierSearch = useFilterSearch({
        useQuery: useBrowseTiers,
        dataKey: 'tiers',
        serverSearchParams: term => ({
            filter: term ? `type:paid+name:~${escapeNqlString(term)}` : 'type:paid'
        }),
        localSearchFilter: (tiers, term) => tiers.filter(t => t.name.toLowerCase().includes(term.toLowerCase())),
        toOption: t => ({value: t.id, label: t.name}),
        useGetById: getTier,
        activeValues: activeTierValues
    });

    const newsletterSearch = useFilterSearch({
        useQuery: useBrowseNewsletters,
        dataKey: 'newsletters',
        serverSearchParams: () => ({}),
        localSearchFilter: (newsletters, term) => newsletters.filter(n => n.name.toLowerCase().includes(term.toLowerCase())),
        toOption: n => ({value: n.id, label: n.name}),
        useGetById: getNewsletter
    });

    // Offers is an anomaly where the API doesn't support pagination so first page includes all offers
    const offerSearch = useFilterSearch({
        useQuery: useBrowseOffersInfinite,
        dataKey: 'offers',
        serverSearchParams: () => ({}),
        localSearchFilter: (offers, term) => offers.filter(o => o.name.toLowerCase().includes(term.toLowerCase())),
        toOption: o => ({value: o.id, label: o.name}),
        useGetById: useBrowseOffersById
    });

    // Offers need raw items for buildOfferOptions (retention offer grouping)
    const offerItems = offerSearch.items;
    const allOfferItems = offerSearch.allItems;
    const offersOptions = useMemo(() => {
        const seen = new Set<string>();
        const merged: typeof offerItems = [];
        for (const offer of offerItems) {
            if (!seen.has(offer.id)) {
                seen.add(offer.id);
                merged.push(offer);
            }
        }
        for (const offer of allOfferItems) {
            if (!seen.has(offer.id)) {
                seen.add(offer.id);
                merged.push(offer);
            }
        }
        return buildOfferOptions(merged);
    }, [offerItems, allOfferItems]);

    // posts combines posts+pages so it's extracted
    const postSearch = usePostResourceSearch();

    const EMAIL_BASE_FILTER = '(status:published,status:sent)+newsletter_id:-null';
    const emailSearch = useFilterSearch({
        useQuery: useBrowsePostsInfinite,
        dataKey: 'posts',
        serverSearchParams: term => ({
            filter: term
                ? `${EMAIL_BASE_FILTER}+title:~${escapeNqlString(term)}`
                : EMAIL_BASE_FILTER,
            fields: 'id,title',
            order: 'published_at DESC'
        }),
        localSearchFilter: (posts, term) => posts.filter(p => p.title.toLowerCase().includes(term.toLowerCase())),
        limit: '25',
        toOption: p => ({value: p.id, label: p.title}),
        useGetById: getPost
    });

    const {data: settingsData} = useBrowseSettings({});

    const settings = settingsData?.settings || [];
    const paidMembersEnabled = getSettingValue<boolean>(settings, 'paid_members_enabled') === true;
    const emailFiltersEnabled = getSettingValue<string>(settings, 'editor_default_email_recipients') !== 'disabled';
    const membersTrackSources = getSettingValue<boolean>(settings, 'members_track_sources') === true;
    const emailTrackOpens = getSettingValue<boolean>(settings, 'email_track_opens') === true;
    const emailTrackClicks = getSettingValue<boolean>(settings, 'email_track_clicks') === true;
    const siteTimezone = getSiteTimezone(settings);

    // Use unfiltered items for field visibility (must not change during search)
    const allPaidTiers = tierSearch.allItems.filter(tier => tier.active);
    const hasMultipleTiers = allPaidTiers.length > 1;
    const newsletters = newsletterSearch.allItems;
    const offers = offerSearch.allItems;

    const hydratedNewsletterSlugs = useMemo(() => {
        return [...new Set(
            filters
                .map(filter => filter.field)
                .filter(field => field.startsWith('newsletters.'))
                .map(field => field.slice('newsletters.'.length))
                .filter(Boolean)
        )];
    }, [filters]);

    const displayFilters = useMemo(() => {
        return mapOfferRedemptionFilters(filters, values => toOfferFilterDisplayValues(values, offersOptions));
    }, [filters, offersOptions]);

    const handleFiltersChange = useCallback((newFilters: Filter[]) => {
        onFiltersChange(mapOfferRedemptionFilters(newFilters, values => fromOfferFilterDisplayValues(values, offersOptions)));
    }, [onFiltersChange, offersOptions]);

    const filterFields = useMemberFilterFields({
        newsletters,
        hydratedNewsletterSlugs,
        hasMultipleTiers,
        paidMembersEnabled,
        emailFiltersEnabled,
        hasLabels: labelSearch.allItems.length > 0,
        labelsOptions: labelSearch.options,
        labelSearchProps: toSearchProps(labelSearch),
        tiersOptions: tierSearch.options,
        tierSearchProps: toSearchProps(tierSearch),
        hasOffers: offers.length > 0,
        offers,
        offerSearchProps: toSearchProps(offerSearch),
        postSearchOptions: postSearch.options,
        postSearchProps: toSearchProps(postSearch),
        emailSearchOptions: emailSearch.options,
        emailSearchProps: toSearchProps(emailSearch),
        membersTrackSources,
        emailTrackOpens,
        emailTrackClicks,
        siteTimezone
    });

    const hasFilters = filters.length > 0;
    const clearAndSaveButtons = hasFilters ? (
        <div className="flex shrink-0 items-center gap-2 sm:absolute sm:top-0 sm:right-0">
            <button
                className="flex items-center gap-1 text-sm font-normal text-muted-foreground hover:text-foreground"
                type="button"
                onClick={() => onFiltersChange([])}
            >
                <LucideIcon.X className="size-4" />
                Clear
            </button>
            {nql && (
                <ManageViewPopover
                    activeView={activeView}
                    existingViews={savedViews}
                    filter={nql}
                    onDeleted={() => onFiltersChange([])}
                />
            )}
        </div>
    ) : undefined;

    return (
        <Filters
            addButtonIcon={hasFilters ? <LucideIcon.FunnelPlus /> : <LucideIcon.Funnel />}
            addButtonText={hasFilters ? 'Add filter' : 'Filter'}
            allowMultiple={true}
            className={`[&>button]:order-last ${hasFilters ? 'sm:!pr-40 [&>button]:border-none' : 'w-auto'}`}
            clearButton={clearAndSaveButtons}
            fields={filterFields}
            filters={displayFilters}
            keyboardShortcut="f"
            popoverAlign={hasFilters ? 'start' : 'end'}
            showClearButton={hasFilters}
            showSearchInput={false}
            onChange={handleFiltersChange}
        />
    );
};

export default MembersFilters;
