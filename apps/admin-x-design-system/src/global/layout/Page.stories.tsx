import type {Meta, StoryObj} from '@storybook/react';
import {useArgs} from '@storybook/preview-api';

import Page, {CustomGlobalAction} from './Page';
import {Tab} from '../TabView';
import ViewContainer from './ViewContainer';

import {testColumns, testRows} from '../table/DynamicTable.stories';
import DynamicTable from '../table/DynamicTable';
import Hint from '../Hint';

const meta = {
    title: 'Global / Layout / Page',
    component: Page,
    tags: ['autodocs'],
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <Page {...args}
            onTabChange={(tab) => {
                updateArgs({selectedTab: tab});
                args.onTabChange?.(tab);
            }}
        />;
    }
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof Page>;

const dummyContent = <div className='m-auto max-w-[800px] p-5 text-center'>Placeholder content</div>;

const customGlobalActions: CustomGlobalAction[] = [
    {
        iconName: 'heart',
        onClick: () => {
            alert('Clicked on custom action');
        }
    }
];

const pageTabs: Tab[] = [
    {
        id: 'steph',
        title: 'Steph Curry'
    },
    {
        id: 'klay',
        title: 'Klay Thompson'
    }
];

export const Default: Story = {
    parameters: {
        layout: 'fullscreen'
    },
    args: {
        pageTabs: pageTabs,
        children: dummyContent
    }
};

export const WithHamburger: Story = {
    parameters: {
        layout: 'fullscreen'
    },
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        children: dummyContent
    }
};

export const WithGlobalActions: Story = {
    parameters: {
        layout: 'fullscreen'
    },
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: dummyContent
    }
};

export const CustomGlobalActions: Story = {
    parameters: {
        layout: 'fullscreen'
    },
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: dummyContent,
        customGlobalActions: customGlobalActions
    }
};

const simpleList = <ViewContainer
    title='List page'
    type='page'
>
    <DynamicTable
        columns={testColumns}
        footer={<Hint>Just a regular table footer</Hint>}
        rows={testRows(100)}
    />
</ViewContainer>;

export const ExampleSimpleList: Story = {
    parameters: {
        layout: 'fullscreen'
    },
    name: 'Example: Simple List',
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: simpleList
    }
};

const stickyList = <ViewContainer
    title='List page'
    type='page'
>
    <DynamicTable
        columns={testColumns}
        footer={<Hint>Sticky footer</Hint>}
        rows={testRows(40)}
        stickyFooter
        stickyHeader
    />
</ViewContainer>;

export const ExampleStickyList: Story = {
    parameters: {
        layout: 'fullscreen'
    },
    name: 'Example: Sticky Header/Footer List',
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: stickyList
    }
};