import React from 'react';
import {CardWrapper} from './../CardWrapper';
import {CollectionCard} from './CollectionCard';
import {DateTime} from 'luxon';
import {MINIMAL_NODES} from '../../../index.js';
import {createEditor} from 'lexical';
import {editorEmptyState} from '../../../../.storybook/editorEmptyState';

const mockPosts = [
    {
        title: 'The Secret Life of Kittens: Uncovering Their Mischievous Master Plans',
        id: 1,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.floor(Math.random() * 100)}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/230/250',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: 'Kittens Gone Wild: Epic Adventures of Feline Daredevils',
        id: 2,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/251/250',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Writer Writterson'
    },
    {
        title: 'The Kitten Olympics: Hilarious Competitions and Paw-some Winners',
        id: 3,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/249/251',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: `Kitten Fashion Faux Paws: The Dos and Don'ts of Kitty Couture`,
        id: 4,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/245/250',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: 'Kittens vs. Veggies: The Great Battle of Green Leafy Monsters',
        id: 5,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/251/255',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Writer Writterson'
    },
    {
        title: 'Kitten Karaoke Night: Unleashing the Musical Talents of Fluffy',
        id: 6,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/249/248',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: `The Kitten's Guide to World Domination: Tips from Aspiring Dictators`,
        id: 7,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/248/250',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: 'Kitten Yoga: Finding Inner Peace, One Stretch at a Time',
        id: 8,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/251/252',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Writer Writterson'
    },
    {
        title: 'The Purrfect Detective: Solving Mysteries with the Clueless Kitten Squad',
        id: 9,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/252/251',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: 'Kitten IQ Test: Are You Smarter Than Your Whiskered Companion?',
        id: 10,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/250/252',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: `The Catnip Chronicles: Tales of Kittens' Hilarious and Trippy Adventures`,
        id: 11,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/251/260',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Writer Writterson'
    },
    {
        title: `Kitten Celebrity Gossip: Who's Dating Whom in the Glamorous Feline World`,
        id: 12,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/240/251',
        reading_time: `${Math.floor(Math.random() * 10)}`,
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
    collection: {slug: 'index'}, // we'll always return some collections, but may need a placeholder in case of no api access
    collections: [],
    postCount: 0,
    headerTextEditorInitialState: editorEmptyState
};

export const PopulatedList = Template.bind({});
PopulatedList.args = {
    display: 'Editing',
    posts: mockPosts,
    collection: {slug: 'index'},
    collections: mockCollections,
    postCount: 6,
    layout: 'list',
    headerTextEditorInitialState: editorEmptyState
};

export const PopulatedGrid = Template.bind({});
PopulatedGrid.args = {
    display: 'Editing',
    posts: mockPosts,
    collection: {slug: 'index'},
    collections: mockCollections,
    postCount: 6,
    layout: 'grid',
    columns: 3,
    headerTextEditorInitialState: editorEmptyState,
    cardWidth: 'wide'
};
