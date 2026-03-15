import type {Meta, StoryObj} from '@storybook/react-vite';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup, SelectSeparator} from './select';

const meta = {
    title: 'Components / Select',
    component: Select,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Dropdown selection component built on Radix UI. Provides accessible keyboard navigation, search, and customizable styling.'
            }
        }
    },
    decorators: [
        Story => (
            <div style={{padding: '24px', minHeight: '200px'}}>
                <Story />
            </div>
        )
    ]
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
    render: () => (
        <Select>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
                <SelectItem value="orange">Orange</SelectItem>
                <SelectItem value="grape">Grape</SelectItem>
                <SelectItem value="strawberry">Strawberry</SelectItem>
            </SelectContent>
        </Select>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Basic select dropdown with simple options.'
            }
        }
    }
};

export const WithGroups: Story = {
    render: () => (
        <Select>
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel>Citrus</SelectLabel>
                    <SelectItem value="orange">Orange</SelectItem>
                    <SelectItem value="lemon">Lemon</SelectItem>
                    <SelectItem value="lime">Lime</SelectItem>
                    <SelectItem value="grapefruit">Grapefruit</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                    <SelectLabel>Berries</SelectLabel>
                    <SelectItem value="strawberry">Strawberry</SelectItem>
                    <SelectItem value="blueberry">Blueberry</SelectItem>
                    <SelectItem value="raspberry">Raspberry</SelectItem>
                    <SelectItem value="blackberry">Blackberry</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Select with grouped options and separators for better organization.'
            }
        }
    }
};

export const WithDefaultValue: Story = {
    render: () => (
        <Select defaultValue="banana">
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
                <SelectItem value="orange">Orange</SelectItem>
                <SelectItem value="grape">Grape</SelectItem>
            </SelectContent>
        </Select>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Select with a pre-selected default value.'
            }
        }
    }
};

export const Disabled: Story = {
    render: () => (
        <Select disabled>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
                <SelectItem value="orange">Orange</SelectItem>
            </SelectContent>
        </Select>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Disabled select that cannot be interacted with.'
            }
        }
    }
};

export const DisabledItems: Story = {
    render: () => (
        <Select>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana" disabled>Banana (Out of stock)</SelectItem>
                <SelectItem value="orange">Orange</SelectItem>
                <SelectItem value="grape" disabled>Grape (Out of stock)</SelectItem>
                <SelectItem value="strawberry">Strawberry</SelectItem>
            </SelectContent>
        </Select>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Select with some disabled items that cannot be selected.'
            }
        }
    }
};

export const LongList: Story = {
    render: () => (
        <Select>
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="de">Germany</SelectItem>
                <SelectItem value="fr">France</SelectItem>
                <SelectItem value="it">Italy</SelectItem>
                <SelectItem value="es">Spain</SelectItem>
                <SelectItem value="au">Australia</SelectItem>
                <SelectItem value="jp">Japan</SelectItem>
                <SelectItem value="kr">South Korea</SelectItem>
                <SelectItem value="cn">China</SelectItem>
                <SelectItem value="in">India</SelectItem>
                <SelectItem value="br">Brazil</SelectItem>
                <SelectItem value="mx">Mexico</SelectItem>
                <SelectItem value="ar">Argentina</SelectItem>
            </SelectContent>
        </Select>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Select with many options showing scroll behavior and search functionality.'
            }
        }
    }
};