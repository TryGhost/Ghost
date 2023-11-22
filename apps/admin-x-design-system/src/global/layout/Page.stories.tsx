import type {Meta, StoryObj} from '@storybook/react';
import {useArgs} from '@storybook/preview-api';

import Page, {CustomGlobalAction} from './Page';
import {Tab} from '../TabView';
import ViewContainer from './ViewContainer';

import {testColumns, testRows} from '../table/DynamicTable.stories';
import {exampleActions as exampleActionButtons} from './ViewContainer.stories';
import DynamicTable from '../table/DynamicTable';
import Hint from '../Hint';
import Heading from '../Heading';
import {tableRowHoverBgClasses} from '../TableRow';
import Breadcrumbs from '../Breadcrumbs';
import Avatar from '../Avatar';
import Button from '../Button';
import {Toggle} from '../..';

const meta = {
    title: 'Global / Layout / Page',
    component: Page,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    },
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

const dummyContent = <div className='w-full bg-grey-100 p-5 text-center'>Placeholder content</div>;

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
        id: 'active',
        title: 'Active'
    },
    {
        id: 'archive',
        title: 'Archive'
    }
];

export const Default: Story = {
    args: {
        pageTabs: pageTabs,
        children: dummyContent
    }
};

export const LimitToolbarWidth: Story = {
    args: {
        pageTabs: pageTabs,
        children: dummyContent,
        fullBleedToolbar: false
    }
};

export const WithHamburger: Story = {
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        children: dummyContent
    }
};

export const WithGlobalActions: Story = {
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: dummyContent
    }
};

export const CustomGlobalActions: Story = {
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: dummyContent,
        customGlobalActions: customGlobalActions
    }
};

const simpleList = <ViewContainer
    title='Members'
    type='page'
>
    <DynamicTable
        columns={testColumns}
        footer={<Hint>Just a regular table footer</Hint>}
        rows={testRows(100)}
    />
</ViewContainer>;

export const ExampleSimpleList: Story = {
    name: 'Example: Simple List',
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: simpleList
    }
};

const stickyList = <ViewContainer
    title='Members'
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
    name: 'Example: Sticky Header/Footer List',
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: stickyList
    }
};

const examplePrimaryAction = <ViewContainer
    primaryAction={{
        title: 'Add member',
        color: 'black',
        onClick: () => {
            alert('Clicked primary action');
        }
    }}
    title='Members'
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

export const ExamplePrimaryAction: Story = {
    name: 'Example: Primary Action',
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: examplePrimaryAction
    }
};

const exampleActionsContent = <ViewContainer
    actions={exampleActionButtons}
    primaryAction={{
        title: 'Add member',
        icon: 'add',
        color: 'black',
        onClick: () => {
            alert('Clicked primary action');
        }
    }}
    title='Members'
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

export const ExampleActions: Story = {
    name: 'Example: Custom Actions',
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: exampleActionsContent
    }
};

const mockIdeaCards = () => {
    const cards = [];

    for (let i = 0; i < 11; i++) {
        cards.push(
            <div className='min-h-[30vh] rounded-sm bg-grey-100 p-7 transition-all hover:bg-grey-200'>
                <Heading level={5}>
                    {i % 3 === 0 && 'Sunset drinks cruise eat sleep repeat'}
                    {i % 3 === 1 && 'Elegance Rolls Royce on my private jet'}
                    {i % 3 === 2 && 'Down to the wire Bathurst 5000 Le Tour'}
                </Heading>
                <div className='mt-4'>
                    {i % 3 === 0 && 'Numea captain’s table crystal waters paradise island the scenic route great adventure. Pirate speak the road less travelled seas the day '}
                    {i % 3 === 1 && 'Another day in paradise cruise life adventure bound gap year cruise time languid afternoons let the sea set you free'}
                    {i % 3 === 2 && <span className='text-grey-500'>No body text</span>}
                </div>
            </div>
        );
    }
    return cards;
};

const exampleCardViewContent = (
    <ViewContainer
        actions={exampleActionButtons}
        primaryAction={{
            title: 'New idea',
            icon: 'add'
        }}
        title='Ideas'
        type='page'
    >
        <div className='grid grid-cols-4 gap-7 py-7'>
            {mockIdeaCards()}
        </div>
    </ViewContainer>
);

export const ExampleCardView: Story = {
    name: 'Example: Card View',
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: exampleCardViewContent
    }
};

const mockPosts = () => {
    const posts = [];

    for (let i = 0; i < 11; i++) {
        posts.push(
            <div className={`group grid grid-cols-[96px_auto_120px_120px_60px] items-center gap-7 border-b border-grey-200 py-5 ${tableRowHoverBgClasses}`}>
                <div className='flex h-24 w-24 items-center justify-center rounded-sm bg-grey-100'>

                </div>
                <div className='overflow-hidden'>
                    <div className='flex flex-col'>
                        <Heading className='truncate' level={5}>
                            {i % 3 === 0 && 'Sunset drinks cruise eat sleep repeat'}
                            {i % 3 === 1 && 'Elegance Rolls Royce on my private jet'}
                            {i % 3 === 2 && 'Down to the wire Bathurst 5000 Le Tour'}
                        </Heading>
                        <div className='truncate'>
                            {i % 3 === 0 && 'Numea captain’s table crystal waters paradise island the scenic route great adventure. Pirate speak the road less travelled seas the day '}
                            {i % 3 === 1 && 'Another day in paradise cruise life adventure bound gap year cruise time languid afternoons let the sea set you free'}
                            {i % 3 === 2 && 'Grand Prix gamble responsibly intensity is not a perfume The Datsun 180B Aerial ping pong knock for six watch with the boys total hospital pass.'}
                        </div>
                    </div>
                </div>
                <div className='flex flex-col'>
                    <strong>15%</strong>
                    viewed
                </div>
                <div className='flex flex-col'>
                    <strong>55%</strong>
                    opened
                </div>
                <div className='flex justify-end pr-7'>
                    <Button className='group-hover:bg-grey-200' icon='ellipsis' />
                </div>
            </div>
        );
    }
    return posts;
};

const examplePostsContent = (
    <ViewContainer
        actions={exampleActionButtons}
        primaryAction={{
            title: 'New post',
            icon: 'add'
        }}
        title='Posts'
        type='page'
    >
        <div className='mb-10'>
            {<>{mockPosts()}</>}
        </div>
    </ViewContainer>
);

export const ExampleAlternativeList: Story = {
    name: 'Example: Alternative List',
    args: {
        pageTabs: pageTabs,
        showPageMenu: true,
        showGlobalActions: true,
        children: examplePostsContent
    }
};

export const ExampleDetailScreen: Story = {
    name: 'Example: Detail Page',
    args: {
        showPageMenu: true,
        breadCrumbs: <Breadcrumbs
            items={[
                {
                    label: 'Members'
                },
                {
                    label: 'Emerson Vaccaro'
                }
            ]}
            backIcon
        />,
        showGlobalActions: true,
        children: <>
            <ViewContainer
                headerContent={
                    <div>
                        <Avatar bgColor='#A5D5F7' label='EV' labelColor='white' size='xl' />
                        <Heading className='mt-2' level={1}>Emerson Vaccaro</Heading>
                        <div className=''>Colombus, OH</div>
                    </div>
                }
                primaryAction={
                    {
                        icon: 'ellipsis',
                        color: 'outline'
                    }
                }
                type='page'>
                <div className='grid grid-cols-4 border-b border-grey-200 pb-5'>
                    <div className='-ml-5 flex h-full flex-col px-5'>
                        <span>Last seen on <strong>22 June 2023</strong></span>
                        <span className='mt-2'>Created on <strong>27 Jan 2021</strong></span>
                    </div>
                    <div className='flex h-full flex-col px-5'>
                        <Heading level={6}>Emails received</Heading>
                        <span className='mt-1 text-4xl font-bold leading-none'>181</span>
                    </div>
                    <div className='flex h-full flex-col px-5'>
                        <Heading level={6}>Emails opened</Heading>
                        <span className='mt-1 text-4xl font-bold leading-none'>104</span>
                    </div>
                    <div className='-mr-5 flex h-full flex-col px-5'>
                        <Heading level={6}>Average open rate</Heading>
                        <span className='mt-1 text-4xl font-bold leading-none'>57%</span>
                    </div>
                </div>
                <div className='grid grid-cols-4 items-baseline py-5'>
                    <div className='-ml-5 flex h-full flex-col gap-6 border-r border-grey-200 px-5'>
                        <div className='flex justify-between'>
                            <Heading level={5}>Member data</Heading>
                            <Button color='green' label='Edit' link />
                        </div>
                        <div>
                            <Heading level={6}>Name</Heading>
                            <div>Emerson Vaccaro</div>
                        </div>
                        <div>
                            <Heading level={6}>Email</Heading>
                            <div>emerson@vaccaro.com</div>
                        </div>
                        <div>
                            <Heading level={6}>Labels</Heading>
                            <div className='inline-block rounded-sm bg-grey-300 px-1 text-xs font-medium'>VIP</div>
                        </div>
                    </div>
                    <div className='flex h-full flex-col gap-6 border-r border-grey-200 px-5'>
                        <Heading level={5}>Newsletters</Heading>
                        <div className='flex flex-col gap-3'>
                            <div className='flex items-center gap-2'>
                                <Toggle />
                                <span>Daily news</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Toggle />
                                <span>Weekly roundup</span>
                            </div>
                        </div>
                    </div>
                    <div className='flex h-full flex-col gap-6 border-r border-grey-200 px-5'>
                        <Heading level={5}>Subscriptions</Heading>
                        <div className='flex flex-col'>
                            <span className='font-semibold'>Gold &mdash; $12/month</span>
                            <span className='text-sm text-grey-500'>Renews 21 Jan 2024</span>
                        </div>
                    </div>
                    <div className='-mr-5 flex h-full flex-col gap-6 px-5'>
                        <Heading level={5}>Activity</Heading>
                        <div className='flex flex-col'>
                            <span className='font-semibold'>Logged in</span>
                            <span className='text-sm text-grey-500'>Renews 21 Jan 2024</span>
                        </div>
                        <div className='flex flex-col'>
                            <span className='font-semibold'>Subscribed to Daily News</span>
                            <span className='text-sm text-grey-500'>Renews 21 Jan 2024</span>
                        </div>
                    </div>
                </div>
            </ViewContainer>
        </>
    }
};