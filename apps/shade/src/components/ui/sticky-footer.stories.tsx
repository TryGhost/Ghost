import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from './button';
import {StickyFooter} from './sticky-footer';

const meta = {
    title: 'Components / Sticky Footer',
    component: StickyFooter,
    parameters: {
        layout: 'centered'
    },
    tags: ['autodocs']
} satisfies Meta<typeof StickyFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: args => (
        <div className="h-64 w-96 overflow-y-auto bg-background px-6">
            <div className="h-96 py-6 text-sm text-muted-foreground">Scrollable content</div>
            <StickyFooter {...args}>
                <div className="flex w-full justify-end gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button>Save</Button>
                </div>
            </StickyFooter>
        </div>
    )
};
