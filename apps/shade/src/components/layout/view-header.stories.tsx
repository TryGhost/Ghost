import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '@/components/ui/button';
import {H1} from './heading';
import {ViewHeader, ViewHeaderActions} from './view-header';

const meta = {
    title: 'Layout / View Header',
    component: ViewHeader,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
} satisfies Meta<typeof ViewHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <ViewHeader>
            <div>
                <H1>Members</H1>
                <p className='mt-2 text-sm text-text-secondary'>Manage your audience and member settings.</p>
            </div>
            <ViewHeaderActions>
                <Button variant="outline">Export</Button>
                <Button>Add member</Button>
            </ViewHeaderActions>
        </ViewHeader>
    )
};

export const TitleOnly: Story = {
    render: () => (
        <ViewHeader>
            <H1>Newsletter</H1>
            <div />
        </ViewHeader>
    )
};

export const StickyPreview: Story = {
    render: () => (
        <div className="h-[520px] overflow-y-auto border border-border-default bg-surface-page px-8">
            <ViewHeader className="bg-surface-page/90">
                <div>
                    <H1>Analytics</H1>
                    <p className='mt-2 text-sm text-text-secondary'>Scroll this panel to verify sticky behavior.</p>
                </div>
                <ViewHeaderActions>
                    <Button variant="outline">Filter</Button>
                    <Button variant="secondary">Compare</Button>
                    <Button>Export report</Button>
                </ViewHeaderActions>
            </ViewHeader>
            <div className="space-y-3 py-8">
                {Array.from({length: 18}, (_, index) => (
                    <div key={index} className="rounded-md border border-border-default bg-surface-panel p-4 text-sm text-text-secondary">
                        Placeholder content row {index + 1}
                    </div>
                ))}
            </div>
        </div>
    )
};
