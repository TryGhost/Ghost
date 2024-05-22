import ErrorBoundary from './ErrorBoundary';
import type {Meta, StoryObj} from '@storybook/react';

const meta = {
    title: 'Global / Error Boundary',
    component: ErrorBoundary,
    tags: ['autodocs']
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

const RaisesError = () => {
    throw new Error('Something went wrong');
};

export const WithError: Story = {
    args: {
        name: 'Test Section',
        children: <RaisesError />
    }
};
