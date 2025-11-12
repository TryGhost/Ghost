import React, {useState} from 'react';
import {Filter, FilterFieldConfig, Filters, LucideIcon} from '@tryghost/shade';

function StatsFilter({...props}: Omit<React.ComponentProps<typeof Filters>, 'filters' | 'fields' | 'onChange'>) {
    const [filters, setFilters] = useState<Filter[]>([]);

    // Grouped fields
    const groupedFields: FilterFieldConfig[] = [
        {
            group: 'Basic',
            fields: [
                {
                    key: 'audience',
                    label: 'Audience',
                    type: 'multiselect',
                    icon: <LucideIcon.Users />,
                    options: [
                        {value: 'public', label: 'Public visitors'},
                        {value: 'free', label: 'Free members'},
                        {value: 'paid', label: 'Paid members'}
                    ]
                },
                {
                    key: 'post',
                    label: 'Post or page',
                    type: 'select',
                    icon: <LucideIcon.File />,
                    options: [
                        {value: 'one', label: 'A Designer’s Dual Apple Studio Display Workspace in Canada'},
                        {value: 'two', label: 'Small and Cosy Apple Setup in Denmark'},
                        {value: 'three', label: 'Minimal & Functional White Desk Setup in Italy'}
                    ]
                },
                {
                    key: 'source',
                    label: 'Source',
                    type: 'select',
                    icon: <LucideIcon.Globe />,
                    options: [
                        {value: 'one', label: 'Google'},
                        {value: 'two', label: 'Facebook'},
                        {value: 'three', label: 'Twitter'}
                    ]
                }
            ]
        },
        {
            group: 'UTM parameters',
            fields: [
                {
                    key: 'source',
                    label: 'UTM Source',
                    type: 'select',
                    icon: <LucideIcon.MousePointerClick />,
                    options: [
                        {value: 'one', label: 'one'},
                        {value: 'two', label: 'two'},
                        {value: 'three', label: 'three'}
                    ]
                },
                {
                    key: 'medium',
                    label: 'UTM Medium',
                    type: 'select',
                    icon: <LucideIcon.SatelliteDish />,
                    options: [
                        {value: 'one', label: 'one'},
                        {value: 'two', label: 'two'},
                        {value: 'three', label: 'three'}
                    ]
                },
                {
                    key: 'campaign',
                    label: 'UTM Campaign',
                    type: 'select',
                    icon: <LucideIcon.Flag />,
                    options: [
                        {value: 'one', label: 'one'},
                        {value: 'two', label: 'two'},
                        {value: 'three', label: 'three'}
                    ]
                },
                {
                    key: 'term',
                    label: 'UTM Term',
                    type: 'select',
                    icon: <LucideIcon.TextCursorInput />,
                    options: [
                        {value: 'one', label: 'one'},
                        {value: 'two', label: 'two'},
                        {value: 'three', label: 'three'}
                    ]
                },
                {
                    key: 'content',
                    label: 'UTM Content',
                    type: 'select',
                    icon: <LucideIcon.FileText />,
                    options: [
                        {value: 'one', label: 'one'},
                        {value: 'two', label: 'two'},
                        {value: 'three', label: 'three'}
                    ]
                }
            ]
        }
    ];

    return (
        <Filters
            className='mb-6 mt-0.5 [&>button]:order-last'
            fields={groupedFields}
            filters={filters}
            showSearchInput={false}
            onChange={setFilters}
            {...props}
        />
    );
};

export default StatsFilter;
