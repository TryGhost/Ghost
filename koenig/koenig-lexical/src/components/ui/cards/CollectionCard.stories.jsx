import React from 'react';
import populateEditor from '../../../utils/storybook/populate-storybook-editor.js';
import {CardWrapper} from './../CardWrapper';
import {CollectionCard} from './CollectionCard';
import {DateTime} from 'luxon';
import {MINIMAL_NODES} from '../../../index.js';
import {createEditor} from 'lexical';
import {editorEmptyState} from '../../../../.storybook/editorEmptyState';

const mockPosts = [
    {
        title: 'Casablanca: A Local\'s Guide',
        id: 1,
        url: 'https://www.google.com',
        published_at: DateTime.now().toISO(),
        excerpt: 'Heading to Casablanca? We\'ve got you covered with our locally sourced cultural insights.',
        feature_image: 'https://images.unsplash.com/photo-1572942718085-154c6bc86c28?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2929&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: 'Where to Eat and Drink in Barbados',
        id: 2,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),

        excerpt: 'Bajan cuisine has evolved over the years, telling a flavourful story of the Barbadian past. As the birthplace of rum, you\'ll never be too far from a rum shop',
        feature_image: 'https://images.unsplash.com/photo-1638834825554-5fe4ee78400d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1287&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Writer Writterson'
    },
    {
        title: '5 Natural Wine Bars You Need to Visit in Paris',
        id: 3,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Natural wine has truly become the drink of the moment, and no where is more fitting to sip a glass, than Paris.',
        feature_image: 'https://images.unsplash.com/photo-1498429152472-9a433d9ddf3b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2970&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: 'Connect With Nature: 4 Off-Grid Destinations for December',
        id: 4,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Looking to switch off? From Sierra Leone to Croatia, here are our top four getaways for a digital detox, where you can experience the world\'s natural wonders',
        feature_image: 'https://images.unsplash.com/photo-1474418397713-7ede21d49118?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2953&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: 'New York City: A Local\'s Guide',
        id: 5,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Heading to NYC? We\'ve got you covered with our locally sourced cultural insights.',
        feature_image: 'https://images.unsplash.com/photo-1558473407-c650db6829f3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2976&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: 'Slow Travel: How to Make Your Journey Matter',
        id: 6,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'With more and more young people experiencing \'burn out\', it\'s no wonder movements like slow travel have been gaining traction over the years.',
        feature_image: 'https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2974&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Writer Writterson'
    },
    {
        title: `Destinations for June: From Raves in Italy to Solstice in Finland`,
        id: 7,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Go off-grid in Scotland or start the festival season with an intimate event located in the town of Bollate.',
        feature_image: 'https://images.unsplash.com/photo-1667247710864-62df1494b597?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1287&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: 'How to Engage the Senses and Immerse Yourself in Nature',
        id: 8,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'How do you mindfully explore the natural world? Learn how to take our outdoor experiences to new heights.',
        feature_image: 'https://images.unsplash.com/photo-1532588241899-839a2a841a76?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2971&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Writer Writterson'
    },
    {
        title: 'Lisbon: A Local\'s Guide',
        id: 9,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'How to navigate around the Portuguese capital according to someone in the know.',
        feature_image: 'https://images.unsplash.com/photo-1533421821268-87e42c1d70b0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3003&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: 'The Best Destinations for Parties, Beaches and Nature This Month',
        id: 10,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Whether you’re looking for a beach party or a tranquil location, we’ve got you covered with this guide.',
        feature_image: 'https://images.unsplash.com/photo-1632054554177-a708126072c5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2970&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    },
    {
        title: `The Most Beautiful and Haunting Cemeteries Around the World`,
        id: 11,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Ahead of Halloween, we\'re highlighting the most impressive cemeteries around the world, ranging from the spookiest burial grounds to centuries-old traditions.',
        feature_image: 'https://images.unsplash.com/photo-1518006367976-382679288263?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2574&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Writer Writterson'
    },
    {
        title: `A Trip Around Iceland: Part II`,
        id: 12,
        url: 'https://www.google.com',
        published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
        excerpt: 'Iceland will not disappear, but the ice might. Humanity needs to adapt to survive. Sustainability is the first step.',
        feature_image: 'https://images.unsplash.com/photo-1609894851180-7be27983da7d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2970&q=80',
        reading_time: `${Math.floor(Math.random() * 10)}`,
        author: 'Author McAuthory'
    }
];

const mockCollections = [
    {
        title: 'Latest',
        slug: 'latest',
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

const Template = ({display, header = 'Featured posts', ...args}) => {
    const headerEditor = createEditor({nodes: MINIMAL_NODES});
    populateEditor({editor: headerEditor, initialHtml: `${header}`});

    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper {...display} {...args}>
                    <CollectionCard
                        {...display}
                        {...args}
                        headerEditor={headerEditor}
                    />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    collection: 'latest', // we'll always return some collections, but may need a placeholder in case of no api access
    collections: mockCollections,
    postCount: 0,
    headerEditorInitialState: editorEmptyState
};

export const PopulatedList = Template.bind({});
PopulatedList.args = {
    display: 'Editing',
    posts: mockPosts,
    collection: 'latest',
    collections: mockCollections,
    header: 'Latest',
    postCount: 6,
    layout: 'list'
};

export const PopulatedGrid = Template.bind({});
PopulatedGrid.args = {
    display: 'Editing',
    posts: mockPosts,
    collection: 'latest',
    collections: mockCollections,
    postCount: 6,
    header: 'Latest',
    layout: 'grid',
    columns: 3,
    cardWidth: 'wide'
};
