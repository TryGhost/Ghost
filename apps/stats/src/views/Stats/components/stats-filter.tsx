import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {AUDIENCE_BITS, STATS_LABEL_MAPPINGS, UNKNOWN_LOCATION_VALUES} from '@src/utils/constants';
import {Button, Filter, FilterFieldConfig, Filters, LucideIcon} from '@tryghost/shade';
import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getAudienceQueryParam} from './audience-select';
import {useAppContext} from '@src/app';
import {useGlobalData} from '@src/providers/global-data-provider';
import {useTinybirdQuery} from '@tryghost/admin-x-framework';
import {useTopContent} from '@tryghost/admin-x-framework/api/stats';

countries.registerLocale(enLocale);

interface StatsFilterProps extends Omit<React.ComponentProps<typeof Filters>, 'fields' | 'onChange'> {
    filters: Filter[];
    utmTrackingEnabled?: boolean;
    onChange?: (filters: Filter[]) => void;
}

// Helper to get country name from code
const getCountryName = (code: string): string => {
    return STATS_LABEL_MAPPINGS[code as keyof typeof STATS_LABEL_MAPPINGS] || countries.getName(code, 'en') || code;
};

// Helper component for visit count badge - used by all filter options
const VisitCountBadge = ({visits}: {visits: number}) => (
    <span className="order-2 font-mono text-xs text-muted-foreground">
        {visits.toLocaleString()}
    </span>
);

// Configuration for each filter field type
interface FilterFieldDefinition {
    endpoint: string;
    valueKey: string;
    // Transform value and get display label
    transformValue?: (value: string) => {value: string; label: string};
    // Filter out invalid items from API response
    filterItem?: (item: Record<string, unknown>) => boolean;
}

const FILTER_FIELD_DEFINITIONS: Record<string, FilterFieldDefinition> = {
    utm_source: {
        endpoint: 'api_top_utm_sources',
        valueKey: 'utm_source',
        transformValue: v => ({value: v || '(not set)', label: v || '(not set)'})
    },
    utm_medium: {
        endpoint: 'api_top_utm_mediums',
        valueKey: 'utm_medium',
        transformValue: v => ({value: v || '(not set)', label: v || '(not set)'})
    },
    utm_campaign: {
        endpoint: 'api_top_utm_campaigns',
        valueKey: 'utm_campaign',
        transformValue: v => ({value: v || '(not set)', label: v || '(not set)'})
    },
    utm_content: {
        endpoint: 'api_top_utm_contents',
        valueKey: 'utm_content',
        transformValue: v => ({value: v || '(not set)', label: v || '(not set)'})
    },
    utm_term: {
        endpoint: 'api_top_utm_terms',
        valueKey: 'utm_term',
        transformValue: v => ({value: v || '(not set)', label: v || '(not set)'})
    },
    source: {
        endpoint: 'api_top_sources',
        valueKey: 'source',
        transformValue: v => ({
            value: v || '',
            label: v || 'Direct'
        })
    },
    location: {
        endpoint: 'api_top_locations',
        valueKey: 'location',
        filterItem(item) {
            const location = String(item.location || '');
            return location !== '' && !UNKNOWN_LOCATION_VALUES.includes(location);
        },
        transformValue: v => ({value: v, label: getCountryName(v)})
    }
};

// Build filter params for Tinybird API, excluding the specified field to avoid circular filtering
const buildFilterParams = (
    currentFilters: Filter[],
    excludeField: string,
    baseParams: Record<string, string>
): Record<string, string> => {
    const params = {...baseParams};

    currentFilters.forEach((filter) => {
        if (filter.field === excludeField || filter.values.length === 0) {
            return;
        }

        const value = filter.values[0] as string;

        if (filter.field === 'post') {
            // Determine if the value is a post_uuid or a pathname
            if (value.startsWith('/')) {
                params.pathname = value;
            } else {
                params.post_uuid = value;
            }
        } else if (filter.field === 'audience') {
            // Skip audience - handled separately via member_status
            return;
        } else if (filter.field === 'source' || filter.field === 'location' || filter.field.startsWith('utm_')) {
            params[filter.field] = value;
        }
    });

    return params;
};

// Generic hook to fetch filter options from Tinybird
// Handles the common pattern: fetch data, transform to options, ensure selected value is included
const useTinybirdFilterOptions = (fieldKey: string, currentFilters: Filter[] = []) => {
    const {statsConfig, range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    const definition = FILTER_FIELD_DEFINITIONS[fieldKey];

    // Build params including filters from other fields
    const params = useMemo(() => {
        const baseParams: Record<string, string> = {
            site_uuid: statsConfig?.id || '',
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            timezone: timezone,
            member_status: getAudienceQueryParam(audience),
            limit: '50'
        };

        return buildFilterParams(currentFilters, fieldKey, baseParams);
    }, [statsConfig?.id, startDate, endDate, timezone, audience, currentFilters, fieldKey]);

    const {data, loading} = useTinybirdQuery({
        endpoint: definition?.endpoint || '',
        statsConfig,
        params,
        enabled: !!definition
    });

    const options = useMemo(() => {
        if (!definition) {
            return [];
        }

        const items = (data as unknown as Array<Record<string, unknown>>) || [];

        // Filter and transform items
        return items
            .filter(item => (definition.filterItem ? definition.filterItem(item) : true))
            .map((item) => {
                const rawValue = String(item[definition.valueKey] ?? '');
                const visits = Number(item.visits) || 0;
                const {value, label} = definition.transformValue
                    ? definition.transformValue(rawValue)
                    : {value: rawValue, label: rawValue};

                return {
                    label,
                    value,
                    icon: <VisitCountBadge visits={visits} />
                };
            });
    }, [data, definition]);

    return {options, loading};
};

// Hook to fetch posts/pages options from Ghost API (which queries Tinybird and enriches with titles)
// This uses a different API pattern so it can't use the generic hook
const usePostOptions = (currentFilters: Filter[] = []) => {
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    // Build query params including filters from other fields (excluding post to avoid circular filtering)
    const queryParams = useMemo(() => {
        const baseParams: Record<string, string> = {
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            member_status: getAudienceQueryParam(audience)
        };

        if (timezone) {
            baseParams.timezone = timezone;
        }

        return buildFilterParams(currentFilters, 'post', baseParams);
    }, [startDate, endDate, timezone, audience, currentFilters]);

    // Fetch top content data from Ghost API (which queries Tinybird and enriches with titles)
    const {data: topContentData, isLoading} = useTopContent({
        searchParams: queryParams
    });

    const options = useMemo(() => {
        const stats = topContentData?.stats;

        // Deduplicate items - prefer post_uuid for posts/pages, use pathname for other content
        const seen = new Set<string>();
        return (stats || [])
            .filter((item) => {
                // Create a unique key - prefer post_uuid if available, otherwise use pathname
                const hasValidPostUuid = item.post_uuid && item.post_uuid !== '' && item.post_uuid !== 'undefined';
                const uniqueKey = hasValidPostUuid ? `uuid:${item.post_uuid}` : `path:${item.pathname}`;

                if (seen.has(uniqueKey)) {
                    return false;
                }
                seen.add(uniqueKey);
                return true;
            })
            .map((item) => {
                const visits = item.visits || 0;
                // Use post_uuid as the filter value if available, otherwise use pathname
                const hasValidPostUuid = item.post_uuid && item.post_uuid !== '' && item.post_uuid !== 'undefined';
                const filterValue = hasValidPostUuid ? item.post_uuid! : item.pathname;

                return {
                    label: item.title || item.pathname || '(Untitled)',
                    value: filterValue,
                    icon: <VisitCountBadge visits={visits} />
                };
            });
    }, [topContentData]);

    return {options, loading: isLoading};
};

function StatsFilter({filters, utmTrackingEnabled = false, onChange, ...props}: StatsFilterProps) {
    const {audience, setAudience} = useGlobalData();
    const {appSettings} = useAppContext();

    // Track if we're currently handling a filter change to prevent loops
    const isHandlingChange = useRef(false);

    // Track if this is the initial mount - we don't want to overwrite URL-loaded filters
    const isInitialMount = useRef(true);

    // Filter audience options based on site settings
    const audienceOptions = useMemo(() => {
        const options = [
            {value: 'undefined', label: 'Public visitors', icon: <LucideIcon.Globe className='text-gray-700'/>, bit: AUDIENCE_BITS.PUBLIC},
            {value: 'free', label: 'Free members', icon: <LucideIcon.User className='text-green'/>, bit: AUDIENCE_BITS.FREE},
            {value: 'paid', label: 'Paid members', icon: <LucideIcon.UserPlus className='text-orange'/>, bit: AUDIENCE_BITS.PAID}
        ];
        return appSettings?.paidMembersEnabled ? options : options.filter(opt => opt.value !== 'paid');
    }, [appSettings?.paidMembersEnabled]);

    // Calculate "all audiences" bitmask based on available options
    const ALL_AUDIENCES = useMemo(() => {
        return audienceOptions.reduce((acc, opt) => acc | opt.bit, 0);
    }, [audienceOptions]);

    // Only sync global audience to filter if the audience filter already exists
    // This prevents showing the filter by default, but keeps it visible once user adds it
    // (even if all options are selected - that's still a valid user choice to display)
    useEffect(() => {
        // Don't sync if we're in the middle of handling a filter change
        if (isHandlingChange.current) {
            return;
        }

        const audienceFilter = filters.find(f => f.field === 'audience');

        // Don't create the filter if it doesn't exist - it should only be created
        // when the user explicitly adds it via the filter UI
        if (!audienceFilter) {
            return;
        }

        // On initial mount with URL filter, sync filter → global state
        // Check if this filter came from URL (has 'url-' prefix in id)
        const isFromUrl = audienceFilter.id.startsWith('url-');

        if (isInitialMount.current && isFromUrl) {
            isInitialMount.current = false;

            // Convert filter values to bitmask and update global state
            const newAudience = audienceOptions
                .filter(opt => audienceFilter.values.includes(opt.value))
                .reduce((acc, opt) => acc | opt.bit, 0);

            if (newAudience > 0 && newAudience !== audience) {
                setAudience(newAudience);
            }
            return;
        }

        // After initial mount, mark as done
        isInitialMount.current = false;

        const currentValues = audienceFilter?.values || [];

        // Convert global audience bitmask to filter values using available options
        const expectedValues = audienceOptions
            .filter(opt => (audience & opt.bit) !== 0)
            .map(opt => opt.value);

        // Only update if values have changed
        const valuesChanged = expectedValues.length !== currentValues.length ||
            !expectedValues.every(v => currentValues.includes(v));

        if (valuesChanged && onChange) {
            if (expectedValues.length > 0) {
                // Update values in place to preserve filter order
                onChange(filters.map(f => (f.field === 'audience' ? {
                    ...f,
                    values: expectedValues
                } : f)));
            } else {
                // Remove the audience filter
                onChange(filters.filter(f => f.field !== 'audience'));
            }
        }
    }, [audience, filters, onChange, audienceOptions, setAudience]);

    // Handle filter changes - update global audience when audience filter changes
    const handleFilterChange = useCallback((newFilters: Filter[]) => {
        // Set flag to prevent the useEffect from running during this change
        isHandlingChange.current = true;

        const oldAudienceFilter = filters.find(f => f.field === 'audience');
        const audienceFilter = newFilters.find(f => f.field === 'audience');
        const values = audienceFilter?.values || [];

        // If audience filter was removed, reset to default (all audiences)
        if (oldAudienceFilter && !audienceFilter) {
            setAudience(ALL_AUDIENCES);
            if (onChange) {
                onChange(newFilters);
            }
            // Reset flag after a short delay to allow the change to propagate
            setTimeout(() => {
                isHandlingChange.current = false;
            }, 0);
            return;
        }

        // Only update audience if the audience filter actually changed
        const audienceChanged = oldAudienceFilter !== audienceFilter ||
            JSON.stringify(oldAudienceFilter?.values) !== JSON.stringify(values);

        if (audienceChanged && audienceFilter) {
            // Convert filter values to bitmask using available options
            const newAudience = audienceOptions
                .filter(opt => values.includes(opt.value))
                .reduce((acc, opt) => acc | opt.bit, 0);

            // Update global audience if it changed
            if (newAudience !== audience) {
                setAudience(newAudience);
            }
        }

        // Pass through to parent onChange
        if (onChange) {
            onChange(newFilters);
        }

        // Reset flag after a short delay to allow the change to propagate
        setTimeout(() => {
            isHandlingChange.current = false;
        }, 0);
    }, [audience, setAudience, onChange, filters, ALL_AUDIENCES, audienceOptions]);

    // Fetch options for all Tinybird-backed fields using the generic hook
    // Options are contextual - filtered based on currently applied filters
    const {options: utmSourceOptions} = useTinybirdFilterOptions('utm_source', filters);
    const {options: utmMediumOptions} = useTinybirdFilterOptions('utm_medium', filters);
    const {options: utmCampaignOptions} = useTinybirdFilterOptions('utm_campaign', filters);
    const {options: utmContentOptions} = useTinybirdFilterOptions('utm_content', filters);
    const {options: utmTermOptions} = useTinybirdFilterOptions('utm_term', filters);
    const {options: sourceOptions} = useTinybirdFilterOptions('source', filters);
    const {options: locationOptions} = useTinybirdFilterOptions('location', filters);

    // Fetch options for posts - data is contextual based on current filters
    const {options: postOptions, loading: postLoading} = usePostOptions(filters);

    // Note: Only 'is' operator supported - Tinybird pipes only support exact match
    const supportedOperators = useMemo(() => [
        {value: 'is', label: 'is'}
    ], []);

    // Grouped fields - memoized to avoid recreation on every render
    const groupedFields: FilterFieldConfig[] = useMemo(() => {
        const utmFields: FilterFieldConfig[] = utmTrackingEnabled ? [
            {
                key: 'utm_source',
                label: 'UTM Source',
                type: 'select',
                icon: <LucideIcon.MousePointerClick className="size-4" />,
                placeholder: 'Select source',
                operators: supportedOperators,
                defaultOperator: 'is',
                hideOperatorSelect: true,
                options: utmSourceOptions,
                searchable: true,
                selectedOptionsClassName: 'hidden'
            },
            {
                key: 'utm_medium',
                label: 'UTM Medium',
                type: 'select',
                icon: <LucideIcon.SatelliteDish className="size-4" />,
                placeholder: 'Select medium',
                operators: supportedOperators,
                defaultOperator: 'is',
                hideOperatorSelect: true,
                options: utmMediumOptions,
                searchable: true,
                selectedOptionsClassName: 'hidden'
            },
            {
                key: 'utm_campaign',
                label: 'UTM Campaign',
                type: 'select',
                icon: <LucideIcon.Flag className="size-4" />,
                placeholder: 'Select campaign',
                operators: supportedOperators,
                defaultOperator: 'is',
                hideOperatorSelect: true,
                options: utmCampaignOptions,
                searchable: true,
                selectedOptionsClassName: 'hidden'
            },
            {
                key: 'utm_content',
                label: 'UTM Content',
                type: 'select',
                icon: <LucideIcon.TextCursorInput className="size-4" />,
                placeholder: 'Select content',
                operators: supportedOperators,
                defaultOperator: 'is',
                hideOperatorSelect: true,
                options: utmContentOptions,
                searchable: true,
                selectedOptionsClassName: 'hidden'
            },
            {
                key: 'utm_term',
                label: 'UTM Term',
                type: 'select',
                icon: <LucideIcon.Tag className="size-4" />,
                placeholder: 'Select term',
                operators: supportedOperators,
                defaultOperator: 'is',
                hideOperatorSelect: true,
                options: utmTermOptions,
                searchable: true,
                selectedOptionsClassName: 'hidden'
            }
        ] : [];

        return [
            {
                group: 'Basic',
                fields: [
                    {
                        key: 'audience',
                        label: 'Audience',
                        type: 'multiselect',
                        icon: <LucideIcon.Users />,
                        options: audienceOptions.map(({value, label, icon}) => ({value, label, icon})),
                        defaultOperator: 'is any of',
                        hideOperatorSelect: true,
                        autoCloseOnSelect: true
                    },
                    {
                        key: 'post',
                        label: 'Post or page',
                        type: 'select',
                        icon: <LucideIcon.PenLine />,
                        options: postOptions,
                        searchable: true,
                        isLoading: postLoading,
                        operators: supportedOperators,
                        defaultOperator: 'is',
                        className: 'w-80',
                        popoverContentClassName: 'w-80',
                        hideOperatorSelect: true,
                        selectedOptionsClassName: 'hidden'
                    },
                    {
                        key: 'source',
                        label: 'Source',
                        type: 'select',
                        icon: <LucideIcon.Globe className="size-4" />,
                        placeholder: 'Select source',
                        operators: supportedOperators,
                        defaultOperator: 'is',
                        hideOperatorSelect: true,
                        options: sourceOptions,
                        searchable: true,
                        selectedOptionsClassName: 'hidden'
                    },
                    {
                        key: 'location',
                        label: 'Location',
                        type: 'select',
                        icon: <LucideIcon.MapPin className="size-4" />,
                        placeholder: 'Select location',
                        operators: supportedOperators,
                        defaultOperator: 'is',
                        hideOperatorSelect: true,
                        options: locationOptions,
                        searchable: true,
                        selectedOptionsClassName: 'hidden'
                    }
                ]
            },
            ...(utmTrackingEnabled ? [{
                group: 'UTM parameters',
                fields: utmFields
            }] : [])
        ];
    }, [utmTrackingEnabled, utmSourceOptions, utmMediumOptions, utmCampaignOptions, utmContentOptions, utmTermOptions, supportedOperators, postOptions, postLoading, audienceOptions, sourceOptions, locationOptions]);

    // Show clear button when there's at least one filter
    const hasFilters = filters.length > 0;

    const handleClearFilters = useCallback(() => {
        // Set flag to prevent the useEffect from running during this change
        isHandlingChange.current = true;

        if (onChange) {
            onChange([]);
        }
        // Reset audience to default (all audiences)
        setAudience(ALL_AUDIENCES);

        // Reset flag after a short delay to allow the change to propagate
        setTimeout(() => {
            isHandlingChange.current = false;
        }, 0);
    }, [onChange, setAudience, ALL_AUDIENCES]);

    return (
        <div className="mt-3 flex w-full justify-between gap-2 lg:mt-0">
            <Filters
                addButtonIcon={<LucideIcon.FunnelPlus />}
                addButtonText={hasFilters ? 'Add filter' : 'Filter'}
                className={`[&>button]:order-last ${hasFilters && '[&>button]:border-none'}`}
                fields={groupedFields}
                filters={filters}
                popoverAlign={hasFilters ? 'start' : 'end'}
                showSearchInput={false}
                // size='sm'
                onChange={handleFilterChange}
                {...props}
            />
            {hasFilters && (
                <Button
                    className='hidden font-normal text-muted-foreground lg:flex'
                    variant="ghost"
                    onClick={handleClearFilters}
                >
                    <LucideIcon.FunnelX />
                    Clear
                </Button>
            )}
        </div>
    );
};

export default StatsFilter;
