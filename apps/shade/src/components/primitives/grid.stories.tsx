import type {Meta, StoryObj} from '@storybook/react-vite';
import {Grid} from './grid';

const meta = {
    title: 'Primitives / Grid',
    component: Grid,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Two-dimensional layout primitive for explicit columns and spacing.'
            }
        }
    }
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof Grid>;

const renderCell = (label: string) => (
    <div className="rounded-md border border-border-default bg-surface-panel p-3 text-sm">
        {label}
    </div>
);

export const TwoColumns: Story = {
    args: {
        columns: 2,
        gap: 'md',
        children: (
            <>
                {renderCell('Card 1')}
                {renderCell('Card 2')}
                {renderCell('Card 3')}
                {renderCell('Card 4')}
            </>
        )
    }
};

export const ThreeColumns: Story = {
    args: {
        columns: 3,
        gap: 'lg',
        children: (
            <>
                {renderCell('A')}
                {renderCell('B')}
                {renderCell('C')}
                {renderCell('D')}
                {renderCell('E')}
                {renderCell('F')}
            </>
        )
    }
};
