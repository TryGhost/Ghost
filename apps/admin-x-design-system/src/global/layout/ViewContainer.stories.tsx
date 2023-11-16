import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import ViewContainer, {PrimaryActionProps, ViewTab} from './ViewContainer';
import Button from '../Button';
import ButtonGroup from '../ButtonGroup';
// import Icon from '../Icon';

const meta = {
    title: 'Global / Layout / View Container',
    component: ViewContainer,
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <ViewContainer {...args}
            onTabChange={(tab) => {
                updateArgs({selectedTab: tab});
                args.onTabChange?.(tab);
            }}
            // onViewChange={(view) => {
            //     updateArgs({selectedView: view});
            //     args.onViewChange?.(view);
            // }}
        />;
    },
    tags: ['autodocs']
} satisfies Meta<typeof ViewContainer>;

export default meta;
type Story = StoryObj<typeof ViewContainer>;

const ContentContainer: React.FC<{children: React.ReactNode}> = ({
    children
}) => {
    return <div className='m-auto max-w-[800px] p-5 text-center'>{children}</div>;
};

const actions = [
    <Button label='Filter' link onClick={() => {
        alert('Clicked filter');
    }} />,
    <Button label='Sort' link onClick={() => {
        alert('Clicked filter');
    }} />,
    <ButtonGroup buttons={[
        {
            icon: 'listview',
            size: 'sm',
            link: true,
            iconColorClass: 'text-black',
            onClick: () => {
                alert('Clicked list view');
            }
        },
        {
            icon: 'cardview',
            size: 'sm',
            link: true,
            iconColorClass: 'text-grey-500',
            onClick: () => {
                alert('Clicked card view');
            }
        }
    ]} />
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
        contents: <ContentContainer>The tabs component lets you add various datasets. It uses the <code>`TabList`</code> component to stay consistent with the simple TabView.</ContentContainer>
    },
    {
        id: 'klay',
        title: 'Klay Thompson',
        contents: <ContentContainer>Splash brother #11.</ContentContainer>
    }
];

export const Default: Story = {
    args: {
        type: 'page',
        headingBorder: false,
        children: <ContentContainer>The view container component is the main container of pages and/or sections on a page. Select one of the stories on the right to browse use cases.</ContentContainer>
    }
};

export const PageType: Story = {
    name: 'Type: Page',
    args: {
        type: 'page',
        title: 'Page title',
        children: <ContentContainer>In its simplest form you can use this component as the main container of pages.</ContentContainer>
    }
};

export const SectionType: Story = {
    name: 'Type: Section',
    args: {
        type: 'section',
        title: 'Section title',
        children: <ContentContainer>This example shows how to use it for sections on a page.</ContentContainer>
    }
};

export const PrimaryActionOnPage: Story = {
    args: {
        type: 'page',
        title: 'Page title',
        primaryAction: primaryAction
    }
};

export const ActionsOnPage: Story = {
    args: {
        type: 'page',
        title: 'Page title',
        actions: actions,
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

export const TabsWithActions: Story = {
    args: {
        type: 'section',
        title: 'Section title',
        tabs: tabs,
        primaryAction: primaryAction,
        actions: actions
    }
};

export const HiddenActions: Story = {
    args: {
        type: 'section',
        title: 'Hover to show actions',
        tabs: tabs,
        actions: actions,
        actionsHidden: true
    }
};