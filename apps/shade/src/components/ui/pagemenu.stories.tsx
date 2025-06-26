import type {Meta, StoryObj} from '@storybook/react';
import {PageMenu, PageMenuItem} from './pagemenu';

const meta: Meta<typeof PageMenu> = {
    title: 'Components/PageMenu',
    component: PageMenu,
    parameters: {
        layout: 'padded'
    },
    tags: ['autodocs'],
    argTypes: {
        responsive: {
            control: 'boolean',
            description: 'When true, items that do not fit horizontally are hidden in a dropdown'
        },
        value: {
            control: 'text',
            description: 'Currently selected item value'
        }
    }
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic story
export const Default: Story = {
    render: args => (
        <PageMenu {...args}>
            <PageMenuItem value="overview">Overview</PageMenuItem>
            <PageMenuItem value="customers">Customers</PageMenuItem>
            <PageMenuItem value="issues">Issues</PageMenuItem>
            <PageMenuItem value="analytics">Analytics</PageMenuItem>
        </PageMenu>
    ),
    args: {
        responsive: false
    }
};

// Responsive story
export const Responsive: Story = {
    render: args => (
        <div className="w-full rounded-lg border border-border p-4">
            <h3 className="mb-3 text-sm font-medium">Resize this container</h3>
            <PageMenu {...args} defaultValue='overview'>
                <PageMenuItem value="overview">Overview</PageMenuItem>
                <PageMenuItem value="web">Web traffic</PageMenuItem>
                <PageMenuItem value="newsletters">Newsletters</PageMenuItem>
                <PageMenuItem value="growth">Growth</PageMenuItem>
                <PageMenuItem value="locations">Locations</PageMenuItem>
            </PageMenu>
        </div>
    ),
    args: {
        responsive: true
    }
};

// Small container
export const SmallContainer: Story = {
    render: args => (
        <div className="w-64 rounded-lg border border-border p-4">
            <h3 className="mb-3 text-sm font-medium">Small container</h3>
            <PageMenu {...args} value="analytics">
                <PageMenuItem value="overview">Overview</PageMenuItem>
                <PageMenuItem value="customers">Customers</PageMenuItem>
                <PageMenuItem value="issues">Issues</PageMenuItem>
                <PageMenuItem value="analytics">Analytics Service</PageMenuItem>
                <PageMenuItem value="reports">Reports</PageMenuItem>
            </PageMenu>
        </div>
    ),
    args: {
        responsive: true
    }
};

// Many items
export const ManyItems: Story = {
    render: args => (
        <div className="w-full max-w-2xl rounded-lg border border-border p-4">
            <h3 className="mb-3 text-sm font-medium">Many items</h3>
            <PageMenu {...args} value="item-5">
                <PageMenuItem value="item-1">Menu Item 1</PageMenuItem>
                <PageMenuItem value="item-2">Menu Item 2</PageMenuItem>
                <PageMenuItem value="item-3">Menu Item 3</PageMenuItem>
                <PageMenuItem value="item-4">Menu Item 4</PageMenuItem>
                <PageMenuItem value="item-5">Menu Item 5</PageMenuItem>
                <PageMenuItem value="item-6">Menu Item 6</PageMenuItem>
                <PageMenuItem value="item-7">Menu Item 7</PageMenuItem>
                <PageMenuItem value="item-8">Menu Item 8</PageMenuItem>
                <PageMenuItem value="item-9">Menu Item 9</PageMenuItem>
                <PageMenuItem value="item-10">Menu Item 10</PageMenuItem>
            </PageMenu>
        </div>
    ),
    args: {
        responsive: true
    }
};
