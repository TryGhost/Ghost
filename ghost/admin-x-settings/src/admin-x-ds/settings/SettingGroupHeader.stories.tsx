import type {Meta, StoryObj} from '@storybook/react';

import ButtonGroup from '../global/ButtonGroup';
import SettingGroupHeader from './SettingGroupHeader';

import {ButtonColors} from '../global/Button';

const meta = {
    title: 'Settings / Setting group header',
    component: SettingGroupHeader,
    tags: ['autodocs']
} satisfies Meta<typeof SettingGroupHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Section group title',
        description: 'Section group description',
        children: <ButtonGroup 
            buttons={
                [
                    {label: 'Edit', color: ButtonColors.Green}
                ]
            } 
            link={true} 
        />
    }
};

export const Editing: Story = {
    args: {
        title: 'Section group title',
        description: 'Section group description',
        children: <ButtonGroup 
            buttons={
                [
                    {label: 'Cancel'},
                    {label: 'Save', color: ButtonColors.Green}
                ]
            } 
            link={true} 
        />
    }
};