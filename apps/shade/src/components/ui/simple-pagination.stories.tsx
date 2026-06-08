import type {Meta, StoryObj} from '@storybook/react-vite';
import {
    SimplePagination,
    SimplePaginationPages,
    SimplePaginationNavigation,
    SimplePaginationPreviousButton,
    SimplePaginationNextButton
} from './simple-pagination';

const meta = {
    title: 'Components / SimplePagination',
    component: SimplePagination,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Simple pagination component with previous/next navigation and page indicators. Designed for basic pagination needs without complex page jumping.'
            }
        }
    },
    decorators: [
        Story => (
            <div style={{padding: '24px'}}>
                <Story />
            </div>
        )
    ]
} satisfies Meta<typeof SimplePagination>;

export default meta;
type Story = StoryObj<typeof SimplePagination>;

export const Default: Story = {
    render: () => (
        <SimplePagination>
            <SimplePaginationPages currentPage="3" totalPages="10" />
            <SimplePaginationNavigation>
                <SimplePaginationPreviousButton />
                <SimplePaginationNextButton />
            </SimplePaginationNavigation>
        </SimplePagination>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Basic pagination showing current page and total pages with navigation buttons.'
            }
        }
    }
};

export const FirstPage: Story = {
    render: () => (
        <SimplePagination>
            <SimplePaginationPages currentPage="1" totalPages="25" />
            <SimplePaginationNavigation>
                <SimplePaginationPreviousButton disabled />
                <SimplePaginationNextButton />
            </SimplePaginationNavigation>
        </SimplePagination>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Pagination on first page with previous button disabled.'
            }
        }
    }
};

export const LastPage: Story = {
    render: () => (
        <SimplePagination>
            <SimplePaginationPages currentPage="25" totalPages="25" />
            <SimplePaginationNavigation>
                <SimplePaginationPreviousButton />
                <SimplePaginationNextButton disabled />
            </SimplePaginationNavigation>
        </SimplePagination>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Pagination on last page with next button disabled.'
            }
        }
    }
};

export const SinglePage: Story = {
    render: () => (
        <SimplePagination>
            <SimplePaginationPages currentPage="1" totalPages="1" />
            <SimplePaginationNavigation>
                <SimplePaginationPreviousButton disabled />
                <SimplePaginationNextButton disabled />
            </SimplePaginationNavigation>
        </SimplePagination>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Pagination with only one page - both navigation buttons are disabled.'
            }
        }
    }
};

export const WithCustomContent: Story = {
    render: () => (
        <SimplePagination>
            <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Showing 21-30 of 247 results</span>
                <SimplePaginationPages currentPage="3" totalPages="25" />
            </div>
            <SimplePaginationNavigation>
                <SimplePaginationPreviousButton />
                <SimplePaginationNextButton />
            </SimplePaginationNavigation>
        </SimplePagination>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Pagination with additional result information alongside page indicators.'
            }
        }
    }
};

export const CompactVersion: Story = {
    render: () => (
        <div className="w-64">
            <SimplePagination>
                <SimplePaginationPages currentPage="5" totalPages="12" />
                <SimplePaginationNavigation>
                    <SimplePaginationPreviousButton />
                    <SimplePaginationNextButton />
                </SimplePaginationNavigation>
            </SimplePagination>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Compact pagination in a smaller container showing responsive behavior.'
            }
        }
    }
};