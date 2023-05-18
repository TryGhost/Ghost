import type {Meta, StoryObj} from '@storybook/react';

import * as SettingGroupHeaderStories from './SettingGroupHeader.stories';
import * as SettingGroupInputStories from './SettingGroupInputs.stories';
import * as SettingGroupValueStories from './SettingGroupValues.stories';

import ButtonGroup from '../global/ButtonGroup';
import SettingGroup from './SettingGroup';
import SettingGroupHeader from './SettingGroupHeader';
import SettingGroupInputs from './SettingGroupInputs';
import SettingGroupValues from './SettingGroupValues';
import {ButtonColors} from '../global/Button';

const meta = {
    title: 'Settings / Setting Group',
    component: SettingGroup,
    tags: ['autodocs'],
    decorators: [(_story: any) => <div style={{maxWidth: '780px'}}>{_story()}</div>]
} satisfies Meta<typeof SettingGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const customButtons = <ButtonGroup buttons={[{label: 'My action', color: ButtonColors.Green}]} link={true} />;
const customHeader = <SettingGroupHeader {...SettingGroupHeaderStories.CustomHeader.args} />;
const singleColContent = <SettingGroupValues {...SettingGroupValueStories.SingleColumn.args} />;
const twoColView = <SettingGroupValues {...SettingGroupValueStories.TwoColumns.args} />;
const twoColEdit = <SettingGroupInputs {...SettingGroupInputStories.TwoColumns.args} />;

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
        state: 'edit',
        title: SingleColumn.args?.title,
        description: SingleColumn.args?.description,
        children: twoColEdit
    }
};

export const Unsaved: Story = {
    args: {
        state: 'unsaved',
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