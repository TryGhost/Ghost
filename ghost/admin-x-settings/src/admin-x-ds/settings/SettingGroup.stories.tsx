import type {Meta, StoryObj} from '@storybook/react';

import * as SettingGroupHeaderStories from './SettingGroupHeader.stories';
import * as SettingGroupInputStories from './SettingGroupInputs.stories';
import * as SettingGroupValueStories from './SettingGroupValues.stories';

import SettingGroup from './SettingGroup';
import SettingGroupHeader from './SettingGroupHeader';
import SettingGroupInputs from './SettingGroupInputs';
import SettingGroupValues from './SettingGroupValues';

const meta = {
    title: 'Settings / Setting Group',
    component: SettingGroup,
    tags: ['autodocs'],
    decorators: [(_story: any) => <div style={{maxWidth: '780px'}}>{_story()}</div>]
} satisfies Meta<typeof SettingGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleColumn: Story = {
    args: {
        state: 'view',
        children: 
            <>
                <SettingGroupHeader {...SettingGroupHeaderStories.Default.args} />
                <SettingGroupValues {...SettingGroupValueStories.SingleColumn.args} />
            </>
    }
};

export const TwoColumns: Story = {
    args: {
        state: 'view',
        children: 
            <>
                <SettingGroupHeader {...SettingGroupHeaderStories.Default.args} />
                <SettingGroupValues {...SettingGroupValueStories.TwoColumns.args} />
            </>
    }
};

export const Editing: Story = {
    args: {
        state: 'edit',
        children: 
            <>
                <SettingGroupHeader {...SettingGroupHeaderStories.Editing.args} />
                <SettingGroupInputs {...SettingGroupInputStories.TwoColumns.args} />
            </>
    }
};

export const Unsaved: Story = {
    args: {
        state: 'unsaved',
        children: 
            <>
                <SettingGroupHeader {...SettingGroupHeaderStories.Editing.args} />
                <SettingGroupInputs {...SettingGroupInputStories.TwoColumns.args} />
            </>
    }
};