import React, {useMemo} from 'react';
import {Filter, FilterFieldConfig, Filters} from '@tryghost/shade';
import {LucideIcon} from '@tryghost/shade';
import {useTinybirdQuery} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getAudienceQueryParam} from '../components/AudienceSelect';

interface UtmFilterSelectProps {
    filters: Filter[];
    onChange: (filters: Filter[]) => void;
    utmTrackingEnabled?: boolean;
    showOnlyButton?: boolean;
}

interface UtmOption {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    visits: number;
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
        limit: 50
    };

    const {data, loading} = useTinybirdQuery<UtmOption>({
        endpoint,
        statsConfig,
        params,
        enabled: enabled && !!endpoint
    });

    const options = useMemo(() => {
        if (!data) {return [];}

        return data.map((item: UtmOption) => ({
            label: `${item[fieldKey as keyof UtmOption] || '(not set)'} (${item.visits.toLocaleString()})`,
            value: String(item[fieldKey as keyof UtmOption] || '(not set)')
        }));
    }, [data, fieldKey]);

    return {options, loading};
};

// Define available UTM filter fields - simple text fields for the "Add filter" dropdown
export const getUtmFilterFieldsForAdd = (): FilterFieldConfig[] => {
    // Note: Only 'is' operator supported - Tinybird pipes only support exact match
    const supportedOperators = [
        {value: 'is', label: 'is'}
    ];

    return [
        {
            key: 'utm_source',
            label: 'UTM Source',
            type: 'text',
            icon: <LucideIcon.Link className="size-4" />,
            placeholder: 'e.g. google, newsletter',
            operators: supportedOperators,
            defaultOperator: 'is'
        },
        {
            key: 'utm_medium',
            label: 'UTM Medium',
            type: 'text',
            icon: <LucideIcon.Network className="size-4" />,
            placeholder: 'e.g. email, social, cpc',
            operators: supportedOperators,
            defaultOperator: 'is'
        },
        {
            key: 'utm_campaign',
            label: 'UTM Campaign',
            type: 'text',
            icon: <LucideIcon.Megaphone className="size-4" />,
            placeholder: 'e.g. summer_sale, launch_2024',
            operators: supportedOperators,
            defaultOperator: 'is'
        },
        {
            key: 'utm_content',
            label: 'UTM Content',
            type: 'text',
            icon: <LucideIcon.FileText className="size-4" />,
            placeholder: 'e.g. header_link, footer_cta',
            operators: supportedOperators,
            defaultOperator: 'is'
        },
        {
            key: 'utm_term',
            label: 'UTM Term',
            type: 'text',
            icon: <LucideIcon.Tag className="size-4" />,
            placeholder: 'e.g. running+shoes, analytics',
            operators: supportedOperators,
            defaultOperator: 'is'
        }
    ];
};

// Define available UTM filter fields with dynamic options for active filters
export const useUtmFilterFieldsWithOptions = (utmTrackingEnabled: boolean, activeFilters: Filter[]): FilterFieldConfig[] => {
    // Only fetch options for fields that are actually in the active filters
    const activeFieldKeys = useMemo(() => activeFilters.map(f => f.field), [activeFilters]);

    const {options: sourceOptions} = useUtmOptionsForField('utm_source', utmTrackingEnabled && activeFieldKeys.includes('utm_source'));
    const {options: mediumOptions} = useUtmOptionsForField('utm_medium', utmTrackingEnabled && activeFieldKeys.includes('utm_medium'));
    const {options: campaignOptions} = useUtmOptionsForField('utm_campaign', utmTrackingEnabled && activeFieldKeys.includes('utm_campaign'));
    const {options: contentOptions} = useUtmOptionsForField('utm_content', utmTrackingEnabled && activeFieldKeys.includes('utm_content'));
    const {options: termOptions} = useUtmOptionsForField('utm_term', utmTrackingEnabled && activeFieldKeys.includes('utm_term'));

    // Note: Only 'is' operator supported - Tinybird pipes only support exact match
    const supportedOperators = [
        {value: 'is', label: 'is'}
    ];

    return useMemo(() => [
        {
            key: 'utm_source',
            label: 'UTM Source',
            type: 'select',
            icon: <LucideIcon.Link className="size-4" />,
            placeholder: 'Select source',
            operators: supportedOperators,
            defaultOperator: 'is',
            options: sourceOptions,
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
    ], [sourceOptions, mediumOptions, campaignOptions, contentOptions, termOptions]);
};

const UtmFilterSelect: React.FC<UtmFilterSelectProps> = ({
    filters,
    onChange,
    utmTrackingEnabled = false,
    showOnlyButton = false
}) => {
    const filterFields = useMemo(() => {
        if (!utmTrackingEnabled) {
            return [];
        }
        return getUtmFilterFieldsForAdd();
    }, [utmTrackingEnabled]);

    if (!utmTrackingEnabled) {
        return null;
    }

    return (
        <Filters
            addButtonIcon={<LucideIcon.Filter className="size-4" />}
            addButtonText={filters.length > 0 ? `Filters (${filters.length})` : 'Filters'}
            fields={filterFields}
            filters={showOnlyButton ? [] : filters}
            popoverContentClassName="max-h-[min(400px,80vh)] overflow-y-auto"
            showSearchInput={true}
            size="sm"
            onChange={onChange}
        />
    );
};

// Export component to render only the active filter pills (below tabs)
export const UtmActiveFilters: React.FC<Omit<UtmFilterSelectProps, 'showOnlyButton'>> = ({
    filters,
    onChange,
    utmTrackingEnabled = false
}) => {
    // Only fetch data for filters that have actual values selected
    // A filter without values is just the field being added but not yet configured
    const hasCompleteFilters = filters.some(f => f.values && f.values.length > 0);
    const filterFields = useUtmFilterFieldsWithOptions(utmTrackingEnabled && hasCompleteFilters, filters);

    if (!utmTrackingEnabled || filters.length === 0) {
        return null;
    }

    return (
        <div className="sticky top-[72px] z-30 -mx-8 bg-white/70 px-8 pb-6 backdrop-blur-md dark:bg-black">
            <Filters
                fields={filterFields}
                filters={filters}
                showAddButton={false}
                size="sm"
                onChange={onChange}
            />
        </div>
    );
};

export default UtmFilterSelect;
