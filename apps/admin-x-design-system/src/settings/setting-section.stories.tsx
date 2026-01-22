import {ReactNode} from 'react';
import type {Meta, StoryObj} from '@storybook/react';

import * as SettingGroupStories from './setting-group.stories';
import SettingGroup from './setting-group';
import SettingSection from './setting-section';

const meta = {
    title: 'Settings / Setting Section',
    component: SettingSection,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode) => <div style={{maxWidth: '780px'}}>{_story()}</div>]
} satisfies Meta<typeof SettingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Section header',
        children:
        <>
            <SettingGroup {...SettingGroupStories.SingleColumn.args} />
            <SettingGroup {...SettingGroupStories.Editing.args} />
            <SettingGroup {...SettingGroupStories.Unsaved.args} />
        </>
    }
};
