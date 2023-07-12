import React from 'react';
import {CardWrapper} from './../CardWrapper';
import {CollectionCard} from './CollectionCard';
import {MINIMAL_NODES} from '../../../index.js';
import {createEditor} from 'lexical';
import {editorEmptyState} from '../../../../.storybook/editorEmptyState';

const mockPosts = [
    {
        title: 'A Post For The Ages',
        id: 123456,
        url: 'https://www.google.com',
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        image: 'https://placekitten.com/250/250',
        author: 'Author McAuthory'
    },
    {
        title: 'Copilot Needs A Post',
        id: 234059,
        url: 'https://www.google.com',
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        image: 'https://placekitten.com/251/250',
        author: 'Writer Writterson'
    },
    {
        title: 'More Suggestions Please And Thank You',
        id: 129837,
        url: 'https://www.google.com',
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        image: 'https://placekitten.com/249/251',
        author: 'Author McAuthory'
    },
    {
        title: 'A Post For The Ages',
        id: 238756,
        url: 'https://www.google.com',
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        image: 'https://placekitten.com/250/250',
        author: 'Author McAuthory'
    },
    {
        title: 'Copilot Needs A Post',
        id: 234259,
        url: 'https://www.google.com',
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        image: 'https://placekitten.com/251/250',
        author: 'Writer Writterson'
    },
    {
        title: 'More Suggestions Please And Thank You',
        id: 129537,
        url: 'https://www.google.com',
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        image: 'https://placekitten.com/249/251',
        author: 'Author McAuthory'
    }
];

const mockCollections = [
    {
        title: 'Latest',
        slug: 'index',
        posts: mockPosts
    }, {
        title: 'Featured',
        slug: 'featured',
        posts: mockPosts.slice(1, 2)
    }
];

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Collection card',
    component: CollectionCard,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected',
                    Editing: 'Editing'
                },
                defaultValue: displayOptions.Default
            }
        },
        layout: {
            options: ['list', 'grid'],
            control: {type: 'radio'}
        },
        postCount: {
            control: {type: 'range', min: 1, max: 12, step: 1}
        },
        columns: {
            control: {type: 'range', min: 1, max: 4, step: 1}
        }
    },
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template = ({display, caption, ...args}) => {
    const headerTextEditor = createEditor({nodes: MINIMAL_NODES});

    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper {...display} {...args}>
                    <CollectionCard
                        {...display}
                        {...args}
                        headerTextEditor={headerTextEditor}
                    />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    collection: {id: 123456}, // we'll always return some collections, but may need a placeholder in case of no api access
    collections: [],
    postCount: 0,
    headerTextEditorInitialState: editorEmptyState
};

export const PopulatedList = Template.bind({});
PopulatedList.args = {
    display: 'Editing',
    posts: mockPosts,
    collection: {id: 123456},
    collections: mockCollections,
    postCount: 6,
    layout: 'list',
    headerTextEditorInitialState: editorEmptyState
};

export const PopulatedGrid = Template.bind({});
PopulatedGrid.args = {
    display: 'Editing',
    posts: mockPosts,
    collection: {id: 123456},
    collections: mockCollections,
    postCount: 6,
    layout: 'grid',
    columns: 3,
    headerTextEditorInitialState: editorEmptyState
};
