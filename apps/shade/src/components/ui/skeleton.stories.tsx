import type {Meta, StoryObj} from '@storybook/react-vite';
import {Skeleton, SkeletonTable} from './skeleton';

const meta = {
    title: 'Components / Skeleton',
    component: Skeleton,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Use `Skeleton` for simple loading lines (supports multiple lines and optional width randomization). `SkeletonTable` provides a ready-made list/table placeholder with varied line widths.'
            }
        }
    }
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof Skeleton>;
type SkeletonTableStory = StoryObj<typeof SkeletonTable>;

export const Default: Story = {
    args: {
        style: {width: 160, height: 16}
    }
};

export const MultipleLines: Story = {
    args: {
        count: 3
    },
    parameters: {
        docs: {
            description: {
                story: 'Render multiple lines using `count` for paragraphs or stacked labels.'
            }
        }
    }
};

export const Randomized: Story = {
    args: {
        count: 4,
        randomize: true,
        minWidth: 40,
        maxWidth: 90
    },
    parameters: {
        docs: {
            description: {
                story: 'Enable `randomize` to simulate natural text line length. Control range with `minWidth`/`maxWidth`.'
            }
        }
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
