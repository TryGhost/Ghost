import type {Meta, StoryObj} from '@storybook/react';

import * as SettingGroupStories from './SettingGroup.stories';
import SettingGroup from './SettingGroup';
import SettingSection from './SettingSection';

const meta = {
    title: 'Settings / Setting Section',
    component: SettingSection,
    tags: ['autodocs'],
    decorators: [(_story: any) => <div style={{maxWidth: '780px'}}>{_story()}</div>]
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
