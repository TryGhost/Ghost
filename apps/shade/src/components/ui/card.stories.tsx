import type {Meta, StoryObj} from '@storybook/react-vite';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from './card';
import {Button} from './button';

const meta = {
    title: 'Components / Card',
    component: Card,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Flexible container for grouped content with consistent styling, padding, and optional border. Compose with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`. KPI variants live under `Features / KPI / Card`.'
            }
        }
    }
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

            <CardFooter key="footer" className="flex grow justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>Deploy</Button>
            </CardFooter>
        ]
    }
};
