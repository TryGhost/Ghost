import type {Meta, StoryObj} from '@storybook/react-vite';
import {Tabs, TabsContent, TabsList, TabsTrigger} from './tabs';

const meta = {
    title: 'Components / Tabs',
    component: Tabs,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Versatile tabs primitive supporting segmented, button, underline, and other variants. KPI-flavoured tabs live under `Features / KPI / Tabs`.'
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
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
    args: {
        defaultValue: 'account',
        variant: 'button-sm',
        children: [
            <TabsList key="list" className="grid w-full grid-cols-2">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>,

            <TabsContent key="account" value="account">
                Account contents
            </TabsContent>,

            <TabsContent key="password" value="password">
                Password contents
            </TabsContent>
        ]
    },
    parameters: {
        docs: {
            description: {
                story: 'Basic tabs with button-sm variant for simple content switching.'
            }
        }
    }
};

export const Segmented: Story = {
    args: {
        defaultValue: 'overview',
        variant: 'segmented',
        children: [
            <TabsList key="list">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>,

            <TabsContent key="overview" value="overview">
                <div className="p-4">Overview content here</div>
            </TabsContent>,

            <TabsContent key="analytics" value="analytics">
                <div className="p-4">Analytics content here</div>
            </TabsContent>,

            <TabsContent key="reports" value="reports">
                <div className="p-4">Reports content here</div>
            </TabsContent>
        ]
    },
    parameters: {
        docs: {
            description: {
                story: 'Segmented control style tabs with rounded background for clear selection.'
            }
        }
    }
};

export const Underline: Story = {
    args: {
        defaultValue: 'home',
        variant: 'underline',
        children: [
            <TabsList key="list">
                <TabsTrigger value="home">Home</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>,

            <TabsContent key="home" value="home">
                <div className="p-4">Home page content</div>
            </TabsContent>,

            <TabsContent key="about" value="about">
                <div className="p-4">About page content</div>
            </TabsContent>,

            <TabsContent key="services" value="services">
                <div className="p-4">Services page content</div>
            </TabsContent>,

            <TabsContent key="contact" value="contact">
                <div className="p-4">Contact page content</div>
            </TabsContent>
        ]
    },
    parameters: {
        docs: {
            description: {
                story: 'Underline style tabs commonly used for website navigation sections.'
            }
        }
    }
};
