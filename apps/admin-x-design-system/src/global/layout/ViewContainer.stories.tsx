import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import ViewContainer, {ViewTab} from './ViewContainer';
import Icon from '../Icon';

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
            onViewChange={(view) => {
                updateArgs({selectedView: view});
                args.onViewChange?.(view);
            }}
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

export const Default: Story = {
    args: {
        headingType: 'text',
        headingContent: 'Table view',
        children: <ContentContainer>The dynamic table component is the basis of lists and tables in Ghost. Quite central to everything.</ContentContainer>
    }
};

export const HeadingSize: Story = {
    args: {
        headingType: 'text',
        headingContent: 'Smaller heading',
        headingTextSize: 4,
        children: <ContentContainer>Use <code>`level`</code> property of the <code>`Heading`</code> component to set heading size.</ContentContainer>
    }
};

/**
 * Multiple views
 */

const multiViews: ViewTab[] = [
    {
        id: 'steph',
        title: 'Steph Curry',
        views: [
            {
                id: 'view-one',
                buttonChildren: <Icon name='listview' size='sm' />,
                contents: <ContentContainer>You can create multiple views and select them in the top right.</ContentContainer>
            },
            {
                id: 'view-two',
                buttonChildren: <Icon name='cardview' size='sm' />,
                contents: <ContentContainer>This is view-two.</ContentContainer>
            }
        ]
    }
];

export const MultiView: Story = {
    args: {
        headingType: 'text',
        headingContent: 'Steph Curry',
        headingTextSize: 4,
        tabs: multiViews
    }
};

/**
 * Simple tabs
 */

const simpleTabs: ViewTab[] = [
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

export const SingleViewTabs: Story = {
    args: {
        headingType: 'tabs',
        tabs: simpleTabs,
        selectedTab: 'steph'
    }
};

/**
 * Tabs with views
 */

const multiViewTabs: ViewTab[] = [
    {
        id: 'steph',
        title: 'Steph Curry',
        views: [
            {
                id: 'view-one',
                buttonChildren: <Icon name='listview' size='sm' />,
                contents: <ContentContainer>You can combine tabs and views. Each tab can have multiple views.</ContentContainer>
            },
            {
                id: 'view-two',
                buttonChildren: <Icon name='cardview' size='sm' />,
                contents: <ContentContainer>Steph Curry view 2</ContentContainer>
            }
        ]
    },
    {
        id: 'klay',
        title: 'Klay Thompson',
        views: [
            {
                id: 'view-one',
                buttonChildren: <Icon name='listview' size='sm' />,
                contents: <ContentContainer>Klay Thompson view 1</ContentContainer>
            },
            {
                id: 'view-two',
                buttonChildren: <Icon name='cardview' size='sm' />,
                contents: <ContentContainer>Klay Thompson view 2</ContentContainer>
            },
            {
                id: 'view-three',
                buttonChildren: <Icon name='heart' size='sm' />,
                contents: <ContentContainer>Klay Thompson view 3</ContentContainer>
            }
        ]
    }
];

export const MultiViewTabs: Story = {
    args: {
        headingType: 'tabs',
        tabs: multiViewTabs,
        selectedTab: 'steph'
    }
};