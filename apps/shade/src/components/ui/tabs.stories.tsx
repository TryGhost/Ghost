import type {Meta, StoryObj} from '@storybook/react';

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';

const meta = {
    title: 'Components / Tabs',
    component: Tabs,
    tags: ['autodocs']
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
    args: {
        children: (
            <Tabs className="w-[400px]" defaultValue="account">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="account">Account</TabsTrigger>
                    <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>
                <TabsContent value="account">
                    Account
                </TabsContent>
                <TabsContent value="password">
                    Password
                </TabsContent>
            </Tabs>
        )
    }
};
