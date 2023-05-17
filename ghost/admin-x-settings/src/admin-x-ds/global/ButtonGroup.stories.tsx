import type {Meta, StoryObj} from '@storybook/react';

import ButtonGroup from './ButtonGroup';
import {ButtonColors} from './Button';

const ButtonGroupMeta = {
    title: 'Global / Button group',
    component: ButtonGroup,
    tags: ['autodocs']
} satisfies Meta<typeof ButtonGroup>;

export default ButtonGroupMeta;

type Story = StoryObj<typeof ButtonGroupMeta>;

const defaultButtons = [
    {
        label: 'Cancel',
        color: ButtonColors.Clear
    },
    {
        label: 'Save',
        color: ButtonColors.Black
    }
];

export const Default: Story = {
    args: {
        buttons: defaultButtons,
        link: false
    }
};

const linkButtons = [
    {
        label: 'Cancel',
        color: ButtonColors.Clear
    },
    {
        label: 'Save',
        color: ButtonColors.Green
    }
];

export const LinkButtons: Story = {
    args: {
        buttons: linkButtons,
        link: true
    }
};