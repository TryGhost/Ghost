import type {Meta, StoryObj} from '@storybook/react';

import Pagination from './Pagination';

const meta = {
    title: 'Global / Pagination',
    component: Pagination,
    tags: ['autodocs']
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
    args: {
        limit: 5,
        total: 15,
        page: 1,
        nextPage: () => {},
        prevPage: () => {}
    }
};

export const LessThanMaximum: Story = {
    args: {
        limit: 9,
        total: 5,
        page: 1,
        nextPage: () => {},
        prevPage: () => {}
    }
};

export const MiddlePage: Story = {
    args: {
        limit: 5,
        total: 15,
        page: 2,
        nextPage: () => {},
        prevPage: () => {}
    }
};

export const LastPage: Story = {
    args: {
        limit: 5,
        total: 15,
        page: 3,
        nextPage: () => {},
        prevPage: () => {}
    }
};

export const UnknownTotal: Story = {
    args: {
        limit: 5,
        page: 1,
        nextPage: () => {},
        prevPage: () => {}
    }
};
