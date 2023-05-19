import type {Meta, StoryObj} from '@storybook/react';

import ButtonGroup from './ButtonGroup';

const ButtonGroupMeta = {
    title: 'Global / Button Group',
    component: ButtonGroup,
    tags: ['autodocs']
} satisfies Meta<typeof ButtonGroup>;

export default ButtonGroupMeta;

type Story = StoryObj<typeof ButtonGroupMeta>;

const defaultButtons = [
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

const linkButtons = [
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