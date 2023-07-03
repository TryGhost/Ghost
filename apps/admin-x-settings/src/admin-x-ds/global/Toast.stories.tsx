import type {Meta, StoryObj} from '@storybook/react';

import ToastContainer from './ToastContainer';
import {Toaster} from 'react-hot-toast';

const meta = {
    title: 'Global / Toast',
    component: ToastContainer,
    tags: ['autodocs'],
    decorators: [(_story: any) => (
        <>
            <Toaster />
            {_story()}
        </>
    )]
} satisfies Meta<typeof ToastContainer>;

export default meta;
type Story = StoryObj<typeof ToastContainer>;

export const Default: Story = {
    args: {
        message: 'Hello notification in a toast'
    }
};

export const Success: Story = {
    args: {
        message: 'Hello success message in a toast',
        type: 'success'
    }
};

export const Error: Story = {
    args: {
        message: 'Hello error message in a toast',
        type: 'error'
    }
};

export const PageError: Story = {
    args: {
        message: 'This is a page error which should not be automatically dismissed.',
        type: 'pageError'
    }
};

export const Icon: Story = {
    args: {
        message: 'Custom icon in a toast',
        icon: 'user-add'
    }
};

export const Custom: Story = {
    args: {
        message: (
            <div>
                And here is one with a longer notification and a <a className='underline' href="https://ghost.org" rel="noreferrer" target="_blank">link</a>, custom <strong>formatting</strong>, icon and duration.
            </div>
        ),
        icon: (
            <>
                👋
            </>
        ),
        options: {
            duration: 10000
        }
    }
};
