import React from 'react';
import {CardWrapper} from './../CardWrapper';
import {CollectionCard} from './CollectionCard';

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
    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper {...display} {...args}>
                    <CollectionCard {...display} {...args} />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    collection: {id: 123456}, // we'll always return some collections, but may need a placeholder in case of no api access
    postCount: 0
};

export const PopulatedList = Template.bind({});
PopulatedList.args = {
    display: 'Editing',
    posts: mockPosts,
    collection: {id: 123456},
    postCount: 3,
    layout: 'list'
};

export const PopulatedGrid = Template.bind({});
PopulatedGrid.args = {
    display: 'Editing',
    posts: mockPosts,
    collection: {id: 123456},
    postCount: 3,
    layout: 'grid',
    columns: 2
};