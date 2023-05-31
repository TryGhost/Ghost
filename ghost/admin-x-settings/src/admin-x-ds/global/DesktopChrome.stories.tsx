import type {Meta, StoryObj} from '@storybook/react';

import DesktopChrome from './DesktopChrome';

const meta = {
    title: 'Global / Chrome / Desktop',
    component: DesktopChrome,
    tags: ['autodocs']
} satisfies Meta<typeof DesktopChrome>;

export default meta;
type Story = StoryObj<typeof DesktopChrome>;

export const Default: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        )
    }
};

export const Small: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        ),
        size: 'sm'
    }
};

export const WithBorder: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        ),
        border: true
    }
};

export const NoTrafficLights: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        ),
        trafficLights: false
    }
};

export const WithHeaderContents: Story = {
    args: {
        children: (
            <div className='flex items-center justify-center p-10 text-sm text-grey-500'>
                Window contents
            </div>
        ),
        header: (
            <div className='flex grow justify-center text-sm font-semibold text-grey-900'>
                Window header
            </div>
        )
    }
};