import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Filter, FilterFieldConfig, Filters, LucideIcon} from '@tryghost/shade';
import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getAudienceQueryParam} from './AudienceSelect';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useTinybirdQuery} from '@tryghost/admin-x-framework';

interface StatsFilterProps extends Omit<React.ComponentProps<typeof Filters>, 'fields' | 'onChange'> {
    filters: Filter[];
    utmTrackingEnabled?: boolean;
    onChange?: (filters: Filter[]) => void;
}

// Audience bit values matching AudienceSelect
const AUDIENCE_BITS = {
    PUBLIC: 1 << 0, // 1
    FREE: 1 << 1, // 2
    PAID: 1 << 2 // 4
};

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
    visits?: number;
}

// Hook to fetch UTM options from Tinybird - only fetches when the field is actively used
const useUtmOptionsForField = (fieldKey: string, enabled: boolean) => {
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

    const params = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience),
        limit: '50'
    };

    const {data, loading} = useTinybirdQuery({
        endpoint,
        statsConfig,
        params,
        enabled: enabled && !!endpoint
    });

    const options = useMemo(() => {
        if (!data) {
            return [];
        }

        return (data as unknown as UtmOption[]).map((item: UtmOption) => ({
            label: String(item[fieldKey as keyof UtmOption] || '(not set)'),
            value: String(item[fieldKey as keyof UtmOption] || '(not set)')
        }));
    }, [data, fieldKey]);

    return {options, loading};
};

// Hook to fetch posts/pages options from Tinybird
const usePostOptions = () => {
    const {statsConfig, range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    const params = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience),
        limit: '100'
    };

    const {data, loading} = useTinybirdQuery({
        endpoint: 'api_top_pages',
        statsConfig,
        params,
        enabled: !!statsConfig?.id
    });

    interface PostOption {
        post_uuid?: string;
        pathname?: string;
        visits?: number;
    }

    const options = useMemo(() => {
        if (!data) {
            return [];
        }

        // Get unique posts by post_uuid, preferring entries with non-empty post_uuid
        const postMap = new Map<string, PostOption>();
        
        (data as unknown as PostOption[]).forEach((item: PostOption) => {
            const uuid = item.post_uuid || '';
            // Only include items with a valid post_uuid (not empty string)
            if (uuid && uuid !== 'undefined') {
                // Keep the entry with the most visits if there are duplicates
                if (!postMap.has(uuid) || (item.visits || 0) > (postMap.get(uuid)?.visits || 0)) {
                    postMap.set(uuid, item);
                }
            }
        });

        return Array.from(postMap.values()).map((item: PostOption) => ({
            label: item.pathname || '(Unknown)',
            value: item.post_uuid || ''
        }));
    }, [data]);

    return {options, loading};
};

// Hook to fetch source options from Tinybird
const useSourceOptions = () => {
    const {statsConfig, range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    const params = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience),
        limit: '50'
    };

    const {data, loading} = useTinybirdQuery({
        endpoint: 'api_top_sources',
        statsConfig,
        params,
        enabled: !!statsConfig?.id
    });

    const options = useMemo(() => {
        if (!data) {
            return [];
        }

        return (data as unknown as SourceOption[]).map((item: SourceOption) => ({
            label: String(item.source || '(not set)'),
            value: String(item.source || '(not set)')
        }));
    }, [data]);

    return {options, loading};
};

function StatsFilter({filters, utmTrackingEnabled = false, onChange, ...props}: StatsFilterProps) {
    const {audience, setAudience} = useGlobalData();

    // Track if we're currently handling a filter change to prevent loops
    const isHandlingChange = useRef(false);

    // Check if all audiences are selected (default state)
    const ALL_AUDIENCES = AUDIENCE_BITS.PUBLIC | AUDIENCE_BITS.FREE | AUDIENCE_BITS.PAID;
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

        // Convert global audience bitmask to filter values
        const expectedValues: string[] = [];
        if ((audience & AUDIENCE_BITS.PUBLIC) !== 0) {
            expectedValues.push('undefined');
        }
        if ((audience & AUDIENCE_BITS.FREE) !== 0) {
            expectedValues.push('free');
        }
        if ((audience & AUDIENCE_BITS.PAID) !== 0) {
            expectedValues.push('paid');
        }

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
    }, [audience, isDefaultAudience, filters, onChange]);

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
            // Convert filter values to bitmask
            let newAudience = 0;
            if (values.includes('undefined')) {
                newAudience |= AUDIENCE_BITS.PUBLIC;
            }
            if (values.includes('free')) {
                newAudience |= AUDIENCE_BITS.FREE;
            }
            if (values.includes('paid')) {
                newAudience |= AUDIENCE_BITS.PAID;
            }

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
    }, [audience, setAudience, onChange, filters, ALL_AUDIENCES]);

    // Fetch options for all UTM fields when UTM tracking is enabled
    // This is needed so options are available in the dropdown
    const {options: utmSourceOptions} = useUtmOptionsForField('utm_source', utmTrackingEnabled);
    const {options: mediumOptions} = useUtmOptionsForField('utm_medium', utmTrackingEnabled);
    const {options: campaignOptions} = useUtmOptionsForField('utm_campaign', utmTrackingEnabled);
    const {options: contentOptions} = useUtmOptionsForField('utm_content', utmTrackingEnabled);
    const {options: termOptions} = useUtmOptionsForField('utm_term', utmTrackingEnabled);

    // Fetch options for posts and sources
    const {options: postOptions} = usePostOptions();
    const {options: sourceOptions} = useSourceOptions();

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
                options: utmSourceOptions,
                searchable: true
            },
            {
                key: 'utm_medium',
                label: 'UTM Medium',
                type: 'select',
                icon: <LucideIcon.Network className="size-4" />,
                placeholder: 'Select medium',
                operators: supportedOperators,
                defaultOperator: 'is',
                options: mediumOptions,
                searchable: true
            },
            {
                key: 'utm_campaign',
                label: 'UTM Campaign',
                type: 'select',
                icon: <LucideIcon.Megaphone className="size-4" />,
                placeholder: 'Select campaign',
                operators: supportedOperators,
                defaultOperator: 'is',
                options: campaignOptions,
                searchable: true
            },
            {
                key: 'utm_content',
                label: 'UTM Content',
                type: 'select',
                icon: <LucideIcon.FileText className="size-4" />,
                placeholder: 'Select content',
                operators: supportedOperators,
                defaultOperator: 'is',
                options: contentOptions,
                searchable: true
            },
            {
                key: 'utm_term',
                label: 'UTM Term',
                type: 'select',
                icon: <LucideIcon.Tag className="size-4" />,
                placeholder: 'Select term',
                operators: supportedOperators,
                defaultOperator: 'is',
                options: termOptions,
                searchable: true
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
                        options: [
                            {value: 'undefined', label: 'Public visitors', icon: <LucideIcon.Globe className='text-gray-700'/>},
                            {value: 'free', label: 'Free members', icon: <LucideIcon.User className='text-green'/>},
                            {value: 'paid', label: 'Paid members', icon: <LucideIcon.UserPlus className='text-orange'/>}
                        ]
                    },
                    {
                        key: 'post',
                        label: 'Post or page',
                        type: 'select',
                        icon: <LucideIcon.File />,
                        options: postOptions,
                        searchable: true
                    },
                    {
                        key: 'source',
                        label: 'Source',
                        type: 'select',
                        icon: <LucideIcon.Globe />,
                        options: sourceOptions,
                        searchable: true
                    }
                ]
            },
            ...(utmTrackingEnabled ? [{
                group: 'UTM parameters',
                fields: utmFields
            }] : [])
        ];
    }, [utmTrackingEnabled, utmSourceOptions, mediumOptions, campaignOptions, contentOptions, termOptions, supportedOperators, postOptions, sourceOptions]);

    return (
        <Filters
            addButtonIcon={filters.length ? <LucideIcon.Plus /> : <LucideIcon.ListFilter />}
            addButtonText={filters.length ? 'Add filter' : 'Filter'}
            className='mb-6 mt-0.5 [&>button]:order-last'
            fields={groupedFields}
            filters={filters}
            showSearchInput={false}
            onChange={handleFilterChange}
            {...props}
        />
    );
};

export default StatsFilter;
