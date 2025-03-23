import type {Meta, StoryObj} from '@storybook/react';
import {ReactNode} from 'react';

import Button from './Button';
import {ShowToastProps, showToast} from './Toast';

/**
 * This component uses `react-hot-toast` which requires the `<Toaster />` component to be included in the app.
 * The design system already does this so you don't have to — just call `showToast()` in any event and it'll work.
 */
const ToastContainer: React.FC<ShowToastProps> = ({...props}) => {
    return (
        <>
            <Button color='black' label='Toast me!' onClick={() => {
                showToast({...props});
            }} />
        </>
    );
};

const meta = {
    title: 'Global / Toast',
    component: ToastContainer,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode) => (
        <>
            {_story()}
        </>
    )]
} satisfies Meta<typeof ToastContainer>;

export default meta;
type Story = StoryObj<typeof ToastContainer>;

export const Default: Story = {
    args: {
        title: 'Toast title',
        message: 'Hello notification in a toast'
    }
};

export const TitleOnly: Story = {
    args: {
        title: 'Hello notification in a toast'
    }
};

export const MinWidth: Story = {
    args: {
        title: 'Min toast'
    }
};

export const TitleWithIcon: Story = {
    args: {
        title: 'Hello notification in a toast',
        type: 'info',
        options: {
            duration: Infinity
        }
    }
};

export const MessageOnly: Story = {
    args: {
        message: 'Hey, this is a message in a toast. Almost like a message in a bottle.'
    }
};

export const Info: Story = {
    args: {
        title: 'Toast title',
        message: 'Hello success message in a toast',
        type: 'info'
    }
};

export const Success: Story = {
    args: {
        title: 'Toast title',
        message: 'Hello success message in a toast',
        type: 'success'
    }
};

export const Error: Story = {
    args: {
        title: 'Toast title',
        message: 'Hello error message in a toast',
        type: 'error'
    }
};

export const Infinite: Story = {
    args: {
        title: 'Toast title',
        message: 'Hello error message in a toast',
        type: 'error',
        options: {
            duration: Infinity
        }
    }
};

export const PageError: Story = {
    args: {
        title: 'Toast title',
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
