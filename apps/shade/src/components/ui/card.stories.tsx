import type {Meta, StoryObj} from '@storybook/react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from './card';
import {Button} from './button';

const meta = {
    title: 'Components / Card',
    component: Card,
    tags: ['autodocs']
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    args: {
        className: 'w-[350px]',
        children: [
            <CardHeader key="header">
                <CardTitle>Create project</CardTitle>
                <CardDescription>Deploy your new project in one-click.</CardDescription>
            </CardHeader>,

            <CardContent key="content">
                Card contents
            </CardContent>,

            <CardFooter key="footer" className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Deploy</Button>
            </CardFooter>
        ]
    }
};
