import type {Meta, StoryObj} from '@storybook/react';

import ButtonGroup from '../globals/ButtonGroup';
import SettingGroupHeader from './SettingGroupHeader';

import {ButtonColors} from '../globals/Button';

const meta = {
    title: 'Settings / Setting group header',
    component: SettingGroupHeader,
    tags: ['autodocs']
} satisfies Meta<typeof SettingGroupHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const buttons = [
    {
        label: 'Edit',
        color: ButtonColors.Green
    }
];

export const Default: Story = {
    args: {
        title: 'Section group title',
        description: 'Section group description',
        children: <ButtonGroup buttons={buttons} link={true} />
    }
};