import type {Meta, StoryObj} from '@storybook/react';

import * as SettingGroupHeaderStories from './SettingGroupHeader.stories';
import * as SettingGroupValueStories from './SettingGroupValues.stories';
import SettingGroup from './SettingGroup';
import SettingGroupHeader from './SettingGroupHeader';
import SettingGroupValues from './SettingGroupValues';

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
        children: 
            <div className='flex flex-col gap-6'>
                <SettingGroupHeader {...SettingGroupHeaderStories.Default.args} />
                <SettingGroupValues {...SettingGroupValueStories.SingleColumn.args} />
            </div>
    }
};

export const Editing: Story = {
    args: {
        state: 'edit',
        children: <SettingGroupHeader {...SettingGroupHeaderStories.Editing.args} />
    }
};

export const Unsaved: Story = {
    args: {
        state: 'unsaved',
        children: <SettingGroupHeader {...SettingGroupHeaderStories.Editing.args} />
    }
};