import type {Meta, StoryObj} from '@storybook/react';

import SettingGroup from './SettingGroup';
import SettingGroupHeader from './SettingGroupHeader';
import {Default as DefaultGroupHeader} from './SettingGroupHeader.stories';

const meta = {
    title: 'Settings / Setting group',
    component: SettingGroup,
    tags: ['autodocs'],
    decorators: [(_story: any) => <div style={{maxWidth: '780px'}}>{_story()}</div>]
} satisfies Meta<typeof SettingGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        state: 'view',
        children: <SettingGroupHeader {...DefaultGroupHeader.args} />
    }
};

export const Editing: Story = {
    args: {
        state: 'edit',
        children: <SettingGroupHeader {...DefaultGroupHeader.args} />
    }
};

export const Unsaved: Story = {
    args: {
        state: 'unsaved',
        children: <SettingGroupHeader {...DefaultGroupHeader.args} />
    }
};