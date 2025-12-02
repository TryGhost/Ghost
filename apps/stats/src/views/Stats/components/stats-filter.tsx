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

interface UtmOption {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    visits: number;
}

interface SourceOption {
    source?: string;
    visits: number;
}

interface LocationOption {
    location?: string;
    visits: number;
}

// Hook to fetch UTM options from Tinybird
// Data is contextual - results are filtered based on currently applied filters
const useUtmOptionsForField = (fieldKey: string, currentFilters: Filter[] = []) => {
    const {statsConfig, range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    const endpointMap: Record<string, string> = {
        utm_source: 'api_top_utm_sources',
        utm_medium: 'api_top_utm_mediums',
        utm_campaign: 'api_top_utm_campaigns',
        utm_content: 'api_top_utm_contents',
        utm_term: 'api_top_utm_terms'
    };

    const endpoint = endpointMap[fieldKey] || '';

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

        // Add filters from currently applied filters (excluding the current field to avoid circular filtering)
        currentFilters.forEach((filter) => {
            if (filter.field === 'post' && filter.values.length > 0) {
                baseParams.post_uuid = filter.values[0] as string;
            } else if (filter.field === 'source' && filter.values.length > 0) {
                baseParams.source = filter.values[0] as string;
            } else if (filter.field !== fieldKey && filter.field.startsWith('utm_') && filter.values.length > 0) {
                // Add other UTM filters
                baseParams[filter.field] = filter.values[0] as string;
            }
        });

        return baseParams;
    }, [statsConfig?.id, startDate, endDate, timezone, audience, currentFilters, fieldKey]);

    const {data, loading} = useTinybirdQuery({
        endpoint,
        statsConfig,
        params,
        enabled: !!endpoint
    });

    const options = useMemo(() => {
        if (!data) {
            return [];
        }

        return (data as unknown as UtmOption[]).map((item: UtmOption) => {
            const value = String(item[fieldKey as keyof UtmOption] || '(not set)');
            const visits = item.visits || 0;
            return {
                label: value,
                value: value,
                // Add a custom icon element that shows the count badge
                icon: (
                    <span className="order-2 font-mono text-xs text-muted-foreground">
                        {visits.toLocaleString()}
                    </span>
                )
            };
        });
    }, [data, fieldKey]);

    return {options, loading};
};

// Hook to fetch source options from Tinybird
// Data is contextual - results are filtered based on currently applied filters
const useSourceOptions = (currentFilters: Filter[] = []) => {
    const {statsConfig, range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

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

        // Add filters from currently applied filters (excluding source to avoid circular filtering)
        currentFilters.forEach((filter) => {
            if (filter.field === 'post' && filter.values.length > 0) {
                baseParams.post_uuid = filter.values[0] as string;
            } else if (filter.field === 'source' && filter.values.length > 0) {
                // Skip source filter to avoid circular filtering
                return;
            } else if (filter.field.startsWith('utm_') && filter.values.length > 0) {
                baseParams[filter.field] = filter.values[0] as string;
            }
        });

        return baseParams;
    }, [statsConfig?.id, startDate, endDate, timezone, audience, currentFilters]);

    const {data, loading} = useTinybirdQuery({
        endpoint: 'api_top_sources',
        statsConfig,
        params,
        enabled: true
    });

    const options = useMemo(() => {
        if (!data) {
            return [];
        }

        return (data as unknown as SourceOption[]).map((item: SourceOption) => {
            // For empty/null sources, use empty string as value (for Tinybird) but display "Direct"
            const isEmpty = !item.source;
            const value = isEmpty ? '' : String(item.source);
            const label = isEmpty ? 'Direct' : String(item.source);
            const visits = item.visits || 0;
            return {
                label,
                value,
                // Add a custom icon element that shows the count badge
                icon: (
                    <span className="order-2 font-mono text-xs text-muted-foreground">
                        {visits.toLocaleString()}
                    </span>
                )
            };
        });
    }, [data]);

    return {options, loading};
};

// Hook to fetch location options from Tinybird
// Data is contextual - results are filtered based on currently applied filters
// Only returns locations that actually have visits in the selected time period
const useLocationOptions = (currentFilters: Filter[] = []) => {
    const {statsConfig, range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    // Helper function to get country name
    const getCountryName = useCallback((code: string): string => {
        return STATS_LABEL_MAPPINGS[code as keyof typeof STATS_LABEL_MAPPINGS] || countries.getName(code, 'en') || code;
    }, []);

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

        // Add filters from currently applied filters (excluding location to avoid circular filtering)
        currentFilters.forEach((filter) => {
            if (filter.field === 'post' && filter.values.length > 0) {
                baseParams.post_uuid = filter.values[0] as string;
            } else if (filter.field === 'source' && filter.values.length > 0) {
                baseParams.source = filter.values[0] as string;
            } else if (filter.field === 'location' && filter.values.length > 0) {
                // Skip location filter to avoid circular filtering
                return;
            } else if (filter.field.startsWith('utm_') && filter.values.length > 0) {
                baseParams[filter.field] = filter.values[0] as string;
            }
        });

        return baseParams;
    }, [statsConfig?.id, startDate, endDate, timezone, audience, currentFilters]);

    const {data, loading} = useTinybirdQuery({
        endpoint: 'api_top_locations',
        statsConfig,
        params,
        enabled: true
    });

    const options = useMemo(() => {
        if (!data) {
            return [];
        }

        return (data as unknown as LocationOption[])
            .filter((item: LocationOption) => {
                // Filter out NULL/empty locations
                const location = String(item.location || '');
                return location && !UNKNOWN_LOCATION_VALUES.includes(location);
            })
            .map((item: LocationOption) => {
                const locationCode = String(item.location || '');
                const visits = item.visits || 0;
                return {
                    label: getCountryName(locationCode),
                    value: locationCode,
                    // Add a custom icon element that shows the count badge
                    icon: (
                        <span className="order-2 font-mono text-xs text-muted-foreground">
                            {visits.toLocaleString()}
                        </span>
                    )
                };
            });
    }, [data, getCountryName]);

    return {options, loading};
};

// Hook to fetch posts/pages options from Tinybird via Ghost API
// Data is contextual - results are filtered based on currently applied filters
// Only returns posts that have actual visits in the selected time period
const usePostOptions = (currentFilters: Filter[] = []) => {
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    // Build query params including filters from other fields (excluding post to avoid circular filtering)
    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            member_status: getAudienceQueryParam(audience)
        };

        if (timezone) {
            params.timezone = timezone;
        }

        // Add filters from currently applied filters (excluding post to avoid circular filtering)
        currentFilters.forEach((filter) => {
            if (filter.field === 'post' && filter.values.length > 0) {
                // Skip post filter to avoid circular filtering
                return;
            } else if (filter.field === 'source' && filter.values.length > 0) {
                params.source = filter.values[0] as string;
            } else if (filter.field === 'location' && filter.values.length > 0) {
                params.location = filter.values[0] as string;
            } else if (filter.field.startsWith('utm_') && filter.values.length > 0) {
                params[filter.field] = filter.values[0] as string;
            }
        });

        return params;
    }, [startDate, endDate, timezone, audience, currentFilters]);

    // Fetch top content data from Ghost API (which queries Tinybird and enriches with titles)
    const {data: topContentData, isLoading} = useTopContent({
        searchParams: queryParams
    });

    const options = useMemo(() => {
        const stats = topContentData?.stats;

        if (!stats) {
            return [];
        }

        // Deduplicate items - prefer post_uuid for posts/pages, use pathname for other content
        const seen = new Set<string>();
        return stats
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
                // The filter logic in web.tsx maps 'post' field to post_uuid param for Tinybird
                const hasValidPostUuid = item.post_uuid && item.post_uuid !== '' && item.post_uuid !== 'undefined';
                const filterValue = hasValidPostUuid ? item.post_uuid! : item.pathname;

                return {
                    label: item.title || item.pathname || '(Untitled)',
                    value: filterValue,
                    // Add a custom icon element that shows the count badge
                    icon: (
                        <span className="order-2 font-mono text-xs text-muted-foreground">
                            {visits.toLocaleString()}
                        </span>
                    )
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

        const currentValues = audienceFilter?.values || [];

        // Convert global audience bitmask to filter values using available options
        const expectedValues = audienceOptions
            .filter(opt => (audience & opt.bit) !== 0)
            .map(opt => opt.value);

        // Only update if values have changed
        const valuesChanged = expectedValues.length !== currentValues.length ||
            !expectedValues.every(v => currentValues.includes(v));

        if (valuesChanged && onChange) {
            const otherFilters = filters.filter(f => f.field !== 'audience');
            if (expectedValues.length > 0) {
                // Keep existing audience filter id if it exists, otherwise create new one
                onChange([
                    ...otherFilters,
                    {
                        id: audienceFilter.id,
                        field: 'audience',
                        operator: 'is',
                        values: expectedValues
                    }
                ]);
            } else {
                onChange(otherFilters);
            }
        }
    }, [audience, filters, onChange, audienceOptions]);

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

    // Fetch options for all UTM fields
    // Options are contextual - filtered based on currently applied filters (e.g., if a post is selected,
    // only UTM params used for that post will be shown)
    const {options: utmSourceOptions} = useUtmOptionsForField('utm_source', filters);
    const {options: utmMediumOptions} = useUtmOptionsForField('utm_medium', filters);
    const {options: utmCampaignOptions} = useUtmOptionsForField('utm_campaign', filters);
    const {options: utmContentOptions} = useUtmOptionsForField('utm_content', filters);
    const {options: utmTermOptions} = useUtmOptionsForField('utm_term', filters);

    // Fetch source options
    const {options: sourceOptions} = useSourceOptions(filters);

    // Fetch location options
    const {options: locationOptions} = useLocationOptions(filters);

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
        if (onChange) {
            onChange([]);
        }
        // Reset audience to default (all audiences)
        setAudience(ALL_AUDIENCES);
    }, [onChange, setAudience, ALL_AUDIENCES]);

    return (
        <div className="mb-6 flex justify-between gap-2">
            <Filters
                addButtonIcon={<LucideIcon.FunnelPlus />}
                addButtonText='Filter'
                className='[&>button]:order-last'
                fields={groupedFields}
                filters={filters}
                showSearchInput={false}
                // size='sm'
                onChange={handleFilterChange}
                {...props}
            />
            {hasFilters && (
                <Button
                    className='font-normal text-muted-foreground'
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
