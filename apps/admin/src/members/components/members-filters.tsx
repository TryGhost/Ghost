import ManageViewPopover from './manage-view-popover';
import React, {useCallback, useMemo} from 'react';
import {Button} from '@tryghost/shade/components';
import {type Filter, Filters} from '@tryghost/shade/patterns';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {
    buildOfferOptions,
    fromOfferFilterDisplayValues,
    toOfferFilterDisplayValues,
    useMemberFilterFields
} from '@/members/use-member-filter-fields';
import {CUSTOM_FIELDS_PREFIX} from '@/members/member-fields';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {getSiteTimezone} from '@tryghost/admin-x-framework/utils/get-site-timezone';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useFeatureFlag} from '@tryghost/admin-x-framework/hooks';
import {useBrowseMemberCustomFields, useBrowseMemberCustomFieldsIncludingArchived} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type {MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {useEmailPostValueSource, useLabelValueSource, usePostResourceValueSource, useTierValueSource} from '@/shared/filter-sources';
import type {MemberView} from '@/members/hooks/use-member-views';

interface MembersFiltersProps {
    filters: Filter[];
    multipleActiveSubscriptionsCount: number;
    nql?: string;
    onFiltersChange: (filters: Filter[]) => void;
    savedViews?: MemberView[];
    activeView?: MemberView | null;
    iconOnly?: boolean;
}

const EMPTY_OFFERS: typeof buildOfferOptions extends (offers: infer T) => unknown ? T : never = [];
const EMPTY_CUSTOM_FIELDS: MemberCustomField[] = [];

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
    multipleActiveSubscriptionsCount,
    nql,
    onFiltersChange,
    savedViews = [],
    activeView,
    iconOnly = false
}) => {
    const {data: offersData} = useBrowseOffers({});
    const {data: newslettersData} = useBrowseNewsletters({searchParams: {limit: '100'}});
    const {data: settingsData} = useBrowseSettings({});

    const settings = settingsData?.settings || [];
    const paidMembersEnabled = getSettingValue<boolean>(settings, 'paid_members_enabled') === true;
    const emailFiltersEnabled = getSettingValue<string>(settings, 'editor_default_email_recipients') !== 'disabled';
    const membersTrackSources = getSettingValue<boolean>(settings, 'members_track_sources') === true;
    const emailTrackOpens = getSettingValue<boolean>(settings, 'email_track_opens') === true;
    const emailTrackClicks = getSettingValue<boolean>(settings, 'email_track_clicks') === true;
    const siteTimezone = getSiteTimezone(settings);

    const newsletters = newslettersData?.newsletters || [];
    const offers = useMemo(() => offersData?.offers ?? EMPTY_OFFERS, [offersData?.offers]);

    const offersOptions = useMemo(() => {
        return buildOfferOptions(offers);
    }, [offers]);
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

    const postValueSource = usePostResourceValueSource();
    const emailValueSource = useEmailPostValueSource();
    const labelValueSource = useLabelValueSource();
    const {valueSource: tierValueSource, hasMultipleTiers} = useTierValueSource();
    const customFieldsEnabled = useFeatureFlag('membersCustomFields');
    // The picker lists active fields — the endpoint the members page has always used.
    const {data: customFieldsData} = useBrowseMemberCustomFields({enabled: customFieldsEnabled});
    const customFields = customFieldsData?.members_custom_fields ?? EMPTY_CUSTOM_FIELDS;
    const referencedCustomFieldKeys = useMemo(() => new Set(
        filters
            .map(filter => filter.field)
            .filter(field => field.startsWith(CUSTOM_FIELDS_PREFIX))
            .map(field => field.slice(CUSTOM_FIELDS_PREFIX.length))
            .filter(Boolean)
    ), [filters]);
    // Only when the current filter references a custom field do we also pull the archived
    // ones, so a saved segment on a since-archived field still renders its read-only pill.
    // Skipped otherwise, so the common members view makes no extra request.
    const {data: archivedCustomFieldsData} = useBrowseMemberCustomFieldsIncludingArchived({
        enabled: customFieldsEnabled && referencedCustomFieldKeys.size > 0
    });
    const archivedCustomFields = useMemo(() => (archivedCustomFieldsData?.members_custom_fields ?? EMPTY_CUSTOM_FIELDS)
        .filter(field => field.status === 'archived' && referencedCustomFieldKeys.has(field.key))
        .map(field => ({key: field.key, name: field.name})), [archivedCustomFieldsData, referencedCustomFieldKeys]);

    const filterFields = useMemberFilterFields({
        newsletters,
        hydratedNewsletterSlugs,
        hasMultipleTiers,
        paidMembersEnabled,
        emailFiltersEnabled,
        labelValueSource,
        tierValueSource,
        offers,
        multipleActiveSubscriptionsCount,
        postValueSource,
        emailValueSource,
        membersTrackSources,
        emailTrackOpens,
        emailTrackClicks,
        siteTimezone,
        customFieldsEnabled,
        customFields,
        archivedCustomFields
    });

    const hasFilters = filters.length > 0;
    const showIconOnlyTrigger = iconOnly && !hasFilters;
    const addFilterButtonClassName = cn(
        'bg-white dark:bg-background',
        showIconOnlyTrigger && 'min-w-[34px] gap-0 !px-3 text-[0px] lg:min-w-0 lg:gap-1.5 lg:px-3 lg:text-base'
    );

    const clearAndSaveButtons = hasFilters ? (
        <div className="flex shrink-0 items-center gap-4 sm:absolute sm:top-0 sm:right-0">
            <Button
                className="hidden items-center gap-1 !px-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground lg:inline-flex"
                type="button"
                variant="ghost"
                onClick={() => onFiltersChange([])}
            >
                <LucideIcon.X className="size-4" />
                Clear
            </Button>
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
            addButtonClassName={addFilterButtonClassName}
            addButtonIcon={hasFilters ? <LucideIcon.FunnelPlus /> : <LucideIcon.Funnel />}
            addButtonText={hasFilters ? 'Add filter' : 'Filter'}
            allowMultiple={true}
            className={`[&>button]:order-last ${hasFilters ? 'sm:!pr-40 [&>button]:border-none' : 'w-auto'}`}
            clearButton={clearAndSaveButtons}
            fields={filterFields}
            filters={displayFilters}
            keyboardShortcut="f"
            popoverAlign={'start'}
            popoverContentClassName='z-[80] w-[280px] [&_[data-slot=command-list]]:max-h-[450px]'
            showClearButton={hasFilters}
            showSearchInput={true}
            onChange={handleFiltersChange}
        />
    );
};

export default MembersFilters;
