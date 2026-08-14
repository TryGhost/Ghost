import type {Meta, StoryObj} from '@storybook/react-vite';

import ViewContainer, {PrimaryActionProps} from './view-container';

const meta = {
    title: 'Global / Layout / View Container',
    component: ViewContainer,
    parameters: {
        layout: 'fullscreen'
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
    <span key='filter'>Filter action slot</span>,
    <span key='sort'>Sort action slot</span>,
    <span key='search'>Search action slot</span>,
    <span key='view-toggle'>View toggle slot</span>
];

const primaryAction: PrimaryActionProps = <span>Primary action slot</span>;

const tabs = <div className='text-sm text-grey-500'>View tabs slot</div>;

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
    <span key='filter'>Filter action slot</span>,
    <span key='view-toggle'>View toggle slot</span>
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
