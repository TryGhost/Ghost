import {ReactNode} from 'react';
import type {Meta, StoryObj} from '@storybook/react';

import * as SettingGroupContentStories from './setting-group-content.stories';
import * as SettingGroupHeaderStories from './setting-group-header.stories';

import ButtonGroup from '../global/button-group';
import SettingGroup from './setting-group';
import SettingGroupContent from './setting-group-content';
import SettingGroupHeader from './setting-group-header';

const meta = {
    title: 'Settings / Setting Group',
    component: SettingGroup,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode) => <div style={{maxWidth: '780px'}}>{_story()}</div>],
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
