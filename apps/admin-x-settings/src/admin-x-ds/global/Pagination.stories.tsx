import type {Meta, StoryObj} from '@storybook/react';

import Pagination from './Pagination';

const meta = {
    title: 'Global / Pagination story',
    component: Pagination,
    tags: ['autodocs']
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
    args: {
        itemsPerPage: 5,
        itemsTotal: 15
    }
};

export const LessThanMaximum: Story = {
    args: {
        itemsPerPage: 9,
        itemsTotal: 5
    }
};

export const MoreThanMaximum: Story = {
    args: {
        itemsPerPage: 5,
        itemsTotal: 15
    }
};
