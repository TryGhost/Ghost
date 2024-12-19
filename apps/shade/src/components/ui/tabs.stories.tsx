import type {Meta, StoryObj} from '@storybook/react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from './tabs';

const meta = {
    title: 'Components / Tabs',
    component: Tabs,
    tags: ['autodocs']
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
    args: {
        defaultValue: 'account',
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
    }
};
