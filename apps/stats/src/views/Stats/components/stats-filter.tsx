import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AUDIENCE_BITS} from '@src/utils/constants';
import {Filter, FilterFieldConfig, Filters, LucideIcon} from '@tryghost/shade';
import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getAudienceQueryParam} from './audience-select';
import {useAppContext} from '@src/app';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useGlobalData} from '@src/providers/global-data-provider';
import {useTinybirdQuery} from '@tryghost/admin-x-framework';

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

// Hook to fetch posts/pages options from Ghost API with search support
const usePostOptions = () => {
    const [searchQuery, setSearchQueryInternal] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Debounce the search query to avoid too many API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Use browse API for both initial load and search
    // When searching, filter by title containing the search query
    // When not searching, fetch latest 20 published posts
    const hasSearchQuery = debouncedSearchQuery.trim().length > 0;

    const filter = hasSearchQuery
        ? `title:~'${debouncedSearchQuery.replace(/'/g, '\\\'')}'+status:[published,sent]`
        : 'status:[published,sent]';

    const {data: browseData, isLoading: isBrowseLoading} = useBrowsePosts({
        searchParams: {
            filter,
            fields: 'id,uuid,title,slug',
            order: 'published_at DESC',
            limit: hasSearchQuery ? '50' : '20'
        }
    });

    const options = useMemo(() => {
        const posts = browseData?.posts;

        if (!posts) {
            return [];
        }

        return posts.map(post => ({
            label: post.title || post.slug || '(Untitled)',
            value: post.uuid
        }));
    }, [browseData]);

    // Memoize the callback to avoid recreating the function on each render
    const setSearchQuery = useCallback((query: string) => {
        setSearchQueryInternal(query);
    }, []);

    return {
        options,
        loading: isBrowseLoading,
        setSearchQuery
    };
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

    const isDefaultAudience = audience === ALL_AUDIENCES;

    // Only sync global audience to filter if:
    // 1. The audience filter already exists (user has interacted with it), OR
    // 2. The global audience is NOT the default "all" state
    // This prevents showing the filter by default when all audiences are selected
    useEffect(() => {
        // Don't sync if we're in the middle of handling a filter change
        if (isHandlingChange.current) {
            return;
        }

        const audienceFilter = filters.find(f => f.field === 'audience');

        // Don't create the filter if it doesn't exist and we're in default "all" state
        if (!audienceFilter && isDefaultAudience) {
            return;
        }

        // Don't sync if there's no audience filter - this prevents creating it
        // when other filters change
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
    }, [audience, isDefaultAudience, filters, onChange, audienceOptions]);

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

    // Fetch options for posts with search support
    const {options: postOptions, loading: postLoading, setSearchQuery} = usePostOptions();

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
                icon: <LucideIcon.Link className="size-4" />,
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
                icon: <LucideIcon.Network className="size-4" />,
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
                icon: <LucideIcon.Megaphone className="size-4" />,
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
                icon: <LucideIcon.FileText className="size-4" />,
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
                        asyncSearch: true,
                        isLoading: postLoading,
                        onSearchChange: setSearchQuery,
                        operators: supportedOperators,
                        defaultOperator: 'is',
                        className: 'w-80',
                        popoverContentClassName: 'w-80',
                        hideOperatorSelect: true
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
                    }
                ]
            },
            ...(utmTrackingEnabled ? [{
                group: 'UTM parameters',
                fields: utmFields
            }] : [])
        ];
    }, [utmTrackingEnabled, utmSourceOptions, utmMediumOptions, utmCampaignOptions, utmContentOptions, utmTermOptions, supportedOperators, postOptions, postLoading, setSearchQuery, audienceOptions, sourceOptions]);

    return (
        <Filters
            addButtonIcon={<LucideIcon.FunnelPlus />}
            addButtonText='Filter'
            className='mb-6 [&>button]:order-last'
            fields={groupedFields}
            filters={filters}
            showSearchInput={false}
            // size='sm'
            onChange={handleFilterChange}
            {...props}
        />
    );
};

export default StatsFilter;
