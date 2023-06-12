import type {Meta, StoryObj} from '@storybook/react';

import * as SettingGroupContentStories from './SettingGroupContent.stories';
import * as SettingGroupHeaderStories from './SettingGroupHeader.stories';

import ButtonGroup from '../global/ButtonGroup';
import SettingGroup from './SettingGroup';
import SettingGroupContent from './SettingGroupContent';
import SettingGroupHeader from './SettingGroupHeader';

const meta = {
    title: 'Settings / Setting Group',
    component: SettingGroup,
    tags: ['autodocs'],
    decorators: [(_story: any) => <div style={{maxWidth: '780px'}}>{_story()}</div>],
    argTypes: {
        description: {
            control: 'text'
        }
    }
} satisfies Meta<typeof SettingGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const customButtons = <ButtonGroup buttons={[{label: 'My action', color: 'green'}]} link={true} />;
const customHeader = <SettingGroupHeader {...SettingGroupHeaderStories.CustomHeader.args} />;
const singleColContent = <SettingGroupContent {...SettingGroupContentStories.SingleColumn.args} />;
const twoColView = <SettingGroupContent {...SettingGroupContentStories.TwoColumns.args} />;
const twoColEdit = <SettingGroupContent {...SettingGroupContentStories.Editing.args} />;

export const SingleColumn: Story = {
    args: {
        title: 'Setting title',
        description: 'Setting description',
        children: singleColContent
    }
};

export const TwoColumns: Story = {
    args: {
        title: SingleColumn.args?.title,
        description: SingleColumn.args?.description,
        children: twoColView
    }
};

export const Editing: Story = {
    args: {
        isEditing: true,
        title: SingleColumn.args?.title,
        description: SingleColumn.args?.description,
        children: twoColEdit
    }
};

export const Unsaved: Story = {
    args: {
        isEditing: true,
        saveState: 'unsaved',
        title: SingleColumn.args?.title,
        description: SingleColumn.args?.description,
        children: twoColEdit
    }
};

export const CustomActions: Story = {
    args: {
        title: SingleColumn.args?.title,
        description: SingleColumn.args?.description,
        customButtons: customButtons
    }
};

export const CustomHeader: Story = {
    args: {
        title: SingleColumn.args?.title,
        description: SingleColumn.args?.description,
        customHeader: customHeader
    }
};

export const NoBorders: Story = {
    args: {
        title: SingleColumn.args?.title,
        description: SingleColumn.args?.description,
        children: twoColView
    }
};
