import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import ViewContainer, {PrimaryActionProps, ViewTab} from './ViewContainer';
import Button from '../Button';
import ButtonGroup from '../ButtonGroup';

const meta = {
    title: 'Global / Layout / View Container',
    component: ViewContainer,
    parameters: {
        layout: 'fullscreen'
    },
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <ViewContainer {...args}
            onTabChange={(tab) => {
                updateArgs({selectedTab: tab});
                args.onTabChange?.(tab);
            }}
        />;
    },
    argTypes: {
        children: {
            control: {
                type: 'text'
            }
        }
    },
    tags: ['autodocs'],
    excludeStories: ['exampleActions']
} satisfies Meta<typeof ViewContainer>;

export default meta;
type Story = StoryObj<typeof ViewContainer>;

export const exampleActions = [
    <Button label='Filter' outlineOnMobile onClick={() => {
        alert('Clicked filter');
    }} />,
    <Button label='Sort' outlineOnMobile onClick={() => {
        alert('Clicked sort');
    }} />,
    <Button icon='magnifying-glass' iconSize='sm' outlineOnMobile onClick={() => {
        alert('Clicked search');
    }} />,
    <ButtonGroup buttons={[
        {
            icon: 'listview',
            size: 'sm',
            iconColorClass: 'text-black',
            onClick: () => {
                alert('Clicked list view');
            }
        },
        {
            icon: 'cardview',
            size: 'sm',
            iconColorClass: 'text-grey-500',
            onClick: () => {
                alert('Clicked card view');
            }
        }
    ]} clearBg={false} link outlineOnMobile />
];

const primaryAction: PrimaryActionProps = {
    title: 'Add item',
    color: 'black',
    onClick: () => {
        alert('Clicked primary action');
    }
};

const tabs: ViewTab[] = [
    {
        id: 'steph',
        title: 'Steph Curry',
        contents: 'The tabs component lets you add various datasets. It uses the <code>`TabList`</code> component to stay consistent with the simple TabView.'
    },
    {
        id: 'klay',
        title: 'Klay Thompson',
        contents: 'Splash brother #11.'
    }
];

export const Default: Story = {
    args: {
        type: 'page',
        toolbarBorder: false,
        children: 'The view container component is the main container of pages and/or sections on a page. Select one of the stories on the right to browse use cases.'
    }
};

export const PageType: Story = {
    name: 'Type: Page',
    args: {
        type: 'page',
        title: 'Page title',
        children: 'In its simplest form you can use this component as the main container of pages.'
    }
};

export const SectionType: Story = {
    name: 'Type: Section',
    args: {
        type: 'section',
        title: 'Section title',
        children: 'This example shows how to use it for sections on a page.'
    }
};

export const PrimaryActionOnPage: Story = {
    args: {
        type: 'page',
        title: 'Page title',
        primaryAction: primaryAction,
        children: 'View contents'
    }
};

export const ActionsOnPage: Story = {
    args: {
        type: 'page',
        title: 'Page title',
        actions: exampleActions,
        primaryAction: primaryAction
    }
};

export const PrimaryActionOnSection: Story = {
    args: {
        type: 'section',
        title: 'Section title',
        primaryAction: primaryAction
    }
};

export const MultipleTabs: Story = {
    args: {
        type: 'section',
        title: 'Section title',
        tabs: tabs
    }
};

export const TabsWithPrimaryAction: Story = {
    args: {
        type: 'section',
        title: 'Section title',
        tabs: tabs,
        primaryAction: primaryAction
    }
};

const sectionActions = [
    <Button label='Filter' size='sm' onClick={() => {
        alert('Clicked filter');
    }} />,
    <ButtonGroup buttons={[
        {
            icon: 'listview',
            size: 'sm',
            iconColorClass: 'text-black',
            onClick: () => {
                alert('Clicked list view');
            }
        },
        {
            icon: 'cardview',
            size: 'sm',
            iconColorClass: 'text-grey-500',
            onClick: () => {
                alert('Clicked card view');
            }
        }
    ]} clearBg={false} size='sm' link />
];

export const TabsWithActions: Story = {
    args: {
        type: 'section',
        title: 'Section title',
        tabs: tabs,
        primaryAction: primaryAction,
        actions: sectionActions
    }
};

export const HiddenActions: Story = {
    args: {
        type: 'section',
        title: 'Hover to show actions',
        tabs: tabs,
        actions: sectionActions,
        actionsHidden: true
    }
};