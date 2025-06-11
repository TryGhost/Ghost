import type {Meta, StoryObj} from '@storybook/react';
import {Skeleton, SkeletonTable} from './skeleton';

const meta = {
    title: 'Components / Skeleton',
    component: Skeleton,
    tags: ['autodocs']
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof Skeleton>;
type SkeletonTableStory = StoryObj<typeof SkeletonTable>;

export const Default: Story = {
    args: {
        style: {width: 160, height: 16}
    }
};

export const TableDefault: SkeletonTableStory = {
    render: args => <SkeletonTable {...args} />,
    args: {
        lines: 5
    },
    parameters: {
        docs: {
            description: {
                story: 'A skeleton table component that renders multiple skeleton lines representing table rows or list items.'
            }
        }
    }
};

export const TableManyLines: SkeletonTableStory = {
    render: args => <SkeletonTable {...args} />,
    args: {
        lines: 8
    },
    parameters: {
        docs: {
            description: {
                story: 'A skeleton table with many lines to show loading state for longer lists.'
            }
        }
    }
};

export const TableMinimal: SkeletonTableStory = {
    render: args => <SkeletonTable {...args} />,
    args: {
        lines: 1
    },
    parameters: {
        docs: {
            description: {
                story: 'A minimal skeleton table with just one line.'
            }
        }
    }
};