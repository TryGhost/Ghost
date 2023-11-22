import type {Meta, StoryObj} from '@storybook/react';

import ButtonGroup from './ButtonGroup';
import {ButtonProps} from './Button';

const ButtonGroupMeta = {
    title: 'Global / Button Group',
    component: ButtonGroup,
    tags: ['autodocs'],
    decorators: [(_story: () => React.ReactNode) => (<div className='inline-block'>{_story()}</div>)]
} satisfies Meta<typeof ButtonGroup>;

export default ButtonGroupMeta;

type Story = StoryObj<typeof ButtonGroupMeta>;

const defaultButtons: ButtonProps[] = [
    {
        label: 'Cancel',
        key: 'cancel'
    },
    {
        label: 'Save',
        key: 'save',
        color: 'black'
    }
];

export const Default: Story = {
    args: {
        buttons: defaultButtons,
        link: false
    }
};

const linkButtons: ButtonProps[] = [
    {
        label: 'Cancel',
        key: 'cancel'
    },
    {
        label: 'Save',
        key: 'save',
        color: 'green'
    }
];

export const LinkButtons: Story = {
    args: {
        buttons: linkButtons,
        link: true
    }
};

export const WithBackground: Story = {
    args: {
        buttons: linkButtons,
        link: true,
        clearBg: false
    }
};

export const SmallWithBackground: Story = {
    args: {
        buttons: linkButtons,
        link: true,
        clearBg: false,
        size: 'sm'
    }
};