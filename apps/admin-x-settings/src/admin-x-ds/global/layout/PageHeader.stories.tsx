import type {Meta, StoryObj} from '@storybook/react';

import PageHeader from './PageHeader';

const meta = {
    title: 'Global / Layout / Page Header',
    component: PageHeader,
    tags: ['autodocs']
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
    args: {
        left: 'Left content',
        center: 'Center content',
        right: 'Right content'
    }
};

export const CustomContainer: Story = {
    args: {
        left: 'Left content',
        center: 'Center content',
        right: 'Right content',
        containerClassName: 'bg-grey-50'
    }
};

export const LeftAndRight: Story = {
    args: {
        left: 'Left content',
        right: 'Right content'
    }
};

export const LeftOnly: Story = {
    args: {
        left: 'Left content'
    }
};

export const CenterOnly: Story = {
    args: {
        center: 'Center content'
    }
};

export const RightOnly: Story = {
    args: {
        right: 'Right content'
    }
};

export const CustomContent: Story = {
    args: {
        children: (
            <div className='flex justify-between'>
                <div className='basis-1/4'>This</div>
                <div className='basis-1/4'>is</div>
                <div className='basis-1/4'>custom</div>
                <div className='basis-1/4'>content!</div>
            </div>
        )
    }
};