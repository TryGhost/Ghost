import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {Filters, type Filter, type FilterFieldConfig, createFilter} from './filters';
import {
    User,
    Mail,
    Globe,
    Phone,
    Calendar,
    DollarSign,
    Hash,
    Clock,
    Tag,
    AlertCircle,
    CheckCircle,
    XCircle,
    Circle
} from 'lucide-react';

const meta = {
    title: 'Components / Filters',
    component: Filters,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Advanced filtering component with support for multiple field types, operators, and customizable UI. Built for complex data filtering scenarios.'
            }
        }
    },
    decorators: [
        Story => (
            <div style={{padding: '24px', minHeight: '400px'}}>
                <Story />
            </div>
        )
    ]
} satisfies Meta<typeof Filters>;

export default meta;
type Story = StoryObj<typeof Filters>;

// Helper component to manage filter state
const FilterDemo = ({fields, initialFilters = [], ...props}: {
    fields: FilterFieldConfig[];
    initialFilters?: Filter[];
    [key: string]: unknown;
}) => {
    const [filters, setFilters] = useState<Filter[]>(initialFilters);

    return (
        <div>
            <Filters
                fields={fields}
                filters={filters}
                onChange={setFilters}
                {...props}
            />
            <div className="mt-6">
                <h4 className="mb-2 text-sm font-medium">Active Filters:</h4>
                <pre className="rounded-md bg-secondary p-4 text-xs">
                    {JSON.stringify(filters, null, 2)}
                </pre>
            </div>
        </div>
    );
};

// Basic field configurations
const basicFields: FilterFieldConfig[] = [
    {
        key: 'text',
        label: 'Text',
        type: 'text',
        icon: <Tag className="size-4" />,
        placeholder: 'Enter text...'
    },
    {
        key: 'email',
        label: 'Email',
        type: 'email',
        icon: <Mail className="size-4" />,
        placeholder: 'Enter email...'
    },
    {
        key: 'website',
        label: 'Website',
        type: 'url',
        icon: <Globe className="size-4" />,
        placeholder: 'Enter URL...'
    },
    {
        key: 'phone',
        label: 'Phone',
        type: 'tel',
        icon: <Phone className="size-4" />,
        placeholder: 'Enter phone...'
    }
];

export const Default: Story = {
    render: () => <FilterDemo fields={basicFields} />,
    parameters: {
        docs: {
            description: {
                story: 'Basic filters with text, email, URL, and phone field types.'
            }
        }
    }
};

// Select fields
const selectFields: FilterFieldConfig[] = [
    {
        key: 'status',
        label: 'Status',
        type: 'select',
        icon: <Circle className="size-4" />,
        options: [
            {value: 'active', label: 'Active', icon: <CheckCircle className="size-3.5 text-green-500" />},
            {value: 'pending', label: 'Pending', icon: <Clock className="size-3.5 text-yellow-500" />},
            {value: 'inactive', label: 'Inactive', icon: <XCircle className="size-3.5 text-red-500" />},
            {value: 'error', label: 'Error', icon: <AlertCircle className="size-3.5 text-red-600" />}
        ]
    },
    {
        key: 'tags',
        label: 'Tags',
        type: 'multiselect',
        icon: <Tag className="size-4" />,
        options: [
            {value: 'urgent', label: 'Urgent', icon: <AlertCircle className="size-3.5 text-red-500" />},
            {value: 'important', label: 'Important', icon: <Circle className="size-3.5 text-orange-500" />},
            {value: 'review', label: 'Review', icon: <Circle className="size-3.5 text-blue-500" />},
            {value: 'archived', label: 'Archived', icon: <Circle className="size-3.5 text-gray-500" />}
        ]
    }
];

export const WithSelectFields: Story = {
    render: () => <FilterDemo fields={selectFields} />,
    parameters: {
        docs: {
            description: {
                story: 'Filters with single-select and multi-select fields with custom icons.'
            }
        }
    }
};

// Date and time fields
const dateTimeFields: FilterFieldConfig[] = [
    {
        key: 'date',
        label: 'Date',
        type: 'date',
        icon: <Calendar className="size-4" />
    },
    {
        key: 'dateRange',
        label: 'Date Range',
        type: 'daterange',
        icon: <Calendar className="size-4" />
    },
    {
        key: 'time',
        label: 'Time',
        type: 'time',
        icon: <Clock className="size-4" />
    },
    {
        key: 'datetime',
        label: 'Date & Time',
        type: 'datetime',
        icon: <Calendar className="size-4" />
    }
];

export const WithDateTimeFields: Story = {
    render: () => <FilterDemo fields={dateTimeFields} />,
    parameters: {
        docs: {
            description: {
                story: 'Filters with date, date range, time, and datetime field types.'
            }
        }
    }
};

// Number fields
const numberFields: FilterFieldConfig[] = [
    {
        key: 'age',
        label: 'Age',
        type: 'number',
        icon: <Hash className="size-4" />,
        min: 0,
        max: 120,
        step: 1
    },
    {
        key: 'percentage',
        label: 'Percentage',
        type: 'number',
        icon: <Hash className="size-4" />,
        min: 0,
        max: 100,
        step: 1,
        suffix: '%'
    },
    {
        key: 'salary',
        label: 'Salary',
        type: 'number',
        icon: <DollarSign className="size-4" />,
        min: 0,
        prefix: '$',
        step: 1000
    }
];

export const WithNumberFields: Story = {
    render: () => <FilterDemo fields={numberFields} />,
    parameters: {
        docs: {
            description: {
                story: 'Filters with number fields including prefix/suffix support.'
            }
        }
    }
};

// Boolean field
const booleanFields: FilterFieldConfig[] = [
    {
        key: 'active',
        label: 'Active',
        type: 'boolean',
        icon: <CheckCircle className="size-4" />,
        onLabel: 'Yes',
        offLabel: 'No'
    },
    {
        key: 'verified',
        label: 'Verified',
        type: 'boolean',
        icon: <CheckCircle className="size-4" />
    }
];

export const WithBooleanFields: Story = {
    render: () => <FilterDemo fields={booleanFields} />,
    parameters: {
        docs: {
            description: {
                story: 'Filters with boolean toggle fields with custom labels.'
            }
        }
    }
};

// Grouped fields
const groupedFields: FilterFieldConfig[] = [
    {
        group: 'Basic Info',
        fields: [
            {
                key: 'name',
                label: 'Name',
                type: 'text',
                icon: <User className="size-4" />,
                placeholder: 'Enter name...'
            },
            {
                key: 'email',
                label: 'Email',
                type: 'email',
                icon: <Mail className="size-4" />,
                placeholder: 'Enter email...'
            }
        ]
    },
    {
        group: 'Status',
        fields: [
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                icon: <Circle className="size-4" />,
                options: [
                    {value: 'active', label: 'Active', icon: <CheckCircle className="size-3.5 text-green-500" />},
                    {value: 'inactive', label: 'Inactive', icon: <XCircle className="size-3.5 text-red-500" />}
                ]
            },
            {
                key: 'verified',
                label: 'Verified',
                type: 'boolean',
                icon: <CheckCircle className="size-4" />
            }
        ]
    },
    {
        group: 'Dates',
        fields: [
            {
                key: 'createdDate',
                label: 'Created Date',
                type: 'date',
                icon: <Calendar className="size-4" />
            },
            {
                key: 'modifiedDate',
                label: 'Modified Date',
                type: 'daterange',
                icon: <Calendar className="size-4" />
            }
        ]
    }
];

export const WithGroupedFields: Story = {
    render: () => <FilterDemo fields={groupedFields} />,
    parameters: {
        docs: {
            description: {
                story: 'Filters with fields organized into logical groups for better UX.'
            }
        }
    }
};

// Pre-populated filters
const prePopulatedFields: FilterFieldConfig[] = [
    {
        key: 'status',
        label: 'Status',
        type: 'select',
        icon: <Circle className="size-4" />,
        options: [
            {value: 'active', label: 'Active', icon: <CheckCircle className="size-3.5 text-green-500" />},
            {value: 'pending', label: 'Pending', icon: <Clock className="size-3.5 text-yellow-500" />},
            {value: 'inactive', label: 'Inactive', icon: <XCircle className="size-3.5 text-red-500" />}
        ]
    },
    {
        key: 'name',
        label: 'Name',
        type: 'text',
        icon: <User className="size-4" />
    }
];

const initialFilters: Filter[] = [
    createFilter('status', 'is', ['active']),
    createFilter('name', 'contains', ['john'])
];

export const WithInitialFilters: Story = {
    render: () => <FilterDemo fields={prePopulatedFields} initialFilters={initialFilters} />,
    parameters: {
        docs: {
            description: {
                story: 'Filters pre-populated with initial values.'
            }
        }
    }
};

// Variant: Solid
export const SolidVariant: Story = {
    render: () => <FilterDemo fields={basicFields} variant="solid" />,
    parameters: {
        docs: {
            description: {
                story: 'Filters with solid variant styling.'
            }
        }
    }
};

// Size variations
export const SmallSize: Story = {
    render: () => <FilterDemo fields={basicFields} size="sm" />,
    parameters: {
        docs: {
            description: {
                story: 'Compact filters with small size.'
            }
        }
    }
};

export const LargeSize: Story = {
    render: () => <FilterDemo fields={basicFields} size="lg" />,
    parameters: {
        docs: {
            description: {
                story: 'Filters with large size for better touch targets.'
            }
        }
    }
};

// Full radius
export const FullRadius: Story = {
    render: () => <FilterDemo fields={basicFields} radius="full" />,
    parameters: {
        docs: {
            description: {
                story: 'Filters with fully rounded corners.'
            }
        }
    }
};

// Custom add button
export const CustomAddButton: Story = {
    render: () => (
        <FilterDemo
            addButtonClassName="bg-primary text-primary-foreground hover:bg-primary/90"
            addButtonText="Add Filter"
            fields={basicFields}
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Filters with custom add button text and styling.'
            }
        }
    }
};

// Allow multiple filters for same field
export const AllowMultipleFilters: Story = {
    render: () => <FilterDemo allowMultiple={true} fields={basicFields} />,
    parameters: {
        docs: {
            description: {
                story: 'Allow multiple filters for the same field.'
            }
        }
    }
};

// No search input
export const NoSearchInput: Story = {
    render: () => <FilterDemo fields={basicFields} showSearchInput={false} />,
    parameters: {
        docs: {
            description: {
                story: 'Filters without search input in the field selector.'
            }
        }
    }
};

// Comprehensive example with all features
const comprehensiveFields: FilterFieldConfig[] = [
    {
        group: 'User Info',
        fields: [
            {
                key: 'name',
                label: 'Name',
                type: 'text',
                icon: <User className="size-4" />,
                placeholder: 'Search name...'
            },
            {
                key: 'email',
                label: 'Email',
                type: 'email',
                icon: <Mail className="size-4" />,
                placeholder: 'Search email...'
            },
            {
                key: 'website',
                label: 'Website',
                type: 'url',
                icon: <Globe className="size-4" />
            }
        ]
    },
    {
        group: 'Status & Classification',
        fields: [
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                icon: <Circle className="size-4" />,
                options: [
                    {value: 'active', label: 'Active', icon: <CheckCircle className="size-3.5 text-green-500" />},
                    {value: 'pending', label: 'Pending', icon: <Clock className="size-3.5 text-yellow-500" />},
                    {value: 'inactive', label: 'Inactive', icon: <XCircle className="size-3.5 text-red-500" />}
                ]
            },
            {
                key: 'tags',
                label: 'Tags',
                type: 'multiselect',
                icon: <Tag className="size-4" />,
                options: [
                    {value: 'urgent', label: 'Urgent'},
                    {value: 'important', label: 'Important'},
                    {value: 'review', label: 'Review'},
                    {value: 'archived', label: 'Archived'}
                ],
                maxSelections: 3
            },
            {
                key: 'verified',
                label: 'Verified',
                type: 'boolean',
                icon: <CheckCircle className="size-4" />,
                onLabel: 'Verified',
                offLabel: 'Not Verified'
            }
        ]
    },
    {
        group: 'Metrics',
        fields: [
            {
                key: 'age',
                label: 'Age',
                type: 'number',
                icon: <Hash className="size-4" />,
                min: 0,
                max: 120
            },
            {
                key: 'score',
                label: 'Score',
                type: 'number',
                icon: <Hash className="size-4" />,
                min: 0,
                max: 100,
                suffix: '%'
            },
            {
                key: 'salary',
                label: 'Salary',
                type: 'number',
                icon: <DollarSign className="size-4" />,
                prefix: '$'
            }
        ]
    },
    {
        group: 'Dates',
        fields: [
            {
                key: 'createdDate',
                label: 'Created',
                type: 'date',
                icon: <Calendar className="size-4" />
            },
            {
                key: 'dateRange',
                label: 'Date Range',
                type: 'daterange',
                icon: <Calendar className="size-4" />
            },
            {
                key: 'time',
                label: 'Time',
                type: 'time',
                icon: <Clock className="size-4" />
            }
        ]
    }
];

export const Comprehensive: Story = {
    render: () => (
        <FilterDemo
            fields={comprehensiveFields}
            initialFilters={[
                createFilter('status', 'is', ['active']),
                createFilter('verified', 'is', [true])
            ]}
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Comprehensive example showcasing all field types and features.'
            }
        }
    }
};

// Validation example
const validationFields: FilterFieldConfig[] = [
    {
        key: 'email',
        label: 'Email',
        type: 'email',
        icon: <Mail className="size-4" />,
        placeholder: 'Enter valid email...'
    },
    {
        key: 'website',
        label: 'Website',
        type: 'url',
        icon: <Globe className="size-4" />,
        placeholder: 'Enter valid URL...'
    },
    {
        key: 'phone',
        label: 'Phone',
        type: 'tel',
        icon: <Phone className="size-4" />,
        placeholder: 'Enter valid phone...'
    }
];

export const WithValidation: Story = {
    render: () => <FilterDemo fields={validationFields} />,
    parameters: {
        docs: {
            description: {
                story: 'Filters with built-in validation for email, URL, and phone fields. Try entering invalid values and pressing Enter or clicking away.'
            }
        }
    }
};

// Solid variant with all sizes
export const SolidAllSizes: Story = {
    render: () => (
        <div className="space-y-6">
            <div>
                <h4 className="mb-2 text-sm font-medium">Small</h4>
                <FilterDemo fields={basicFields} size="sm" variant="solid" />
            </div>
            <div>
                <h4 className="mb-2 text-sm font-medium">Medium (Default)</h4>
                <FilterDemo fields={basicFields} size="md" variant="solid" />
            </div>
            <div>
                <h4 className="mb-2 text-sm font-medium">Large</h4>
                <FilterDemo fields={basicFields} size="lg" variant="solid" />
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Comparison of all sizes with solid variant.'
            }
        }
    }
};

// Add button positioned at the end
export const AddButtonAtEnd: Story = {
    render: () => (
        <FilterDemo
            className="[&>button]:order-last"
            fields={basicFields}
            initialFilters={[
                createFilter('text', 'contains', ['example']),
                createFilter('email', 'contains', ['@example.com'])
            ]}
        />
    ),
    parameters: {
        docs: {
            description: {
                story: 'Add button positioned at the end (right side) of the filter list using CSS order property. This is achieved with the className prop: `className="[&>button]:order-last"`'
            }
        }
    }
};
