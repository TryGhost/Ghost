import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {CollectionCard} from '../components/ui/cards/CollectionCard';
import {DateTime} from 'luxon';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function CollectionNodeComponent({collection, columns, layout, nodeKey, postCount}) {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [posts, setPosts] = React.useState([]);

    const mockPosts = [
        {
            title: 'The Secret Life of Kittens: Uncovering Their Mischievous Master Plans',
            id: 1,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.floor(Math.random() * 100)}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/230/250',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Author McAuthory'
        },
        {
            title: 'Kittens Gone Wild: Epic Adventures of Feline Daredevils',
            id: 2,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/251/250',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Writer Writterson'
        },
        {
            title: 'The Kitten Olympics: Hilarious Competitions and Paw-some Winners',
            id: 3,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/249/251',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Author McAuthory'
        },
        {
            title: `Kitten Fashion Faux Paws: The Dos and Don'ts of Kitty Couture`,
            id: 4,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/245/250',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Author McAuthory'
        },
        {
            title: 'Kittens vs. Veggies: The Great Battle of Green Leafy Monsters',
            id: 5,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/251/255',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Writer Writterson'
        },
        {
            title: 'Kitten Karaoke Night: Unleashing the Musical Talents of Fluffy',
            id: 6,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/249/248',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Author McAuthory'
        },
        {
            title: `The Kitten's Guide to World Domination: Tips from Aspiring Dictators`,
            id: 7,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/248/250',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Author McAuthory'
        },
        {
            title: 'Kitten Yoga: Finding Inner Peace, One Stretch at a Time',
            id: 8,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/251/252',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Writer Writterson'
        },
        {
            title: 'The Purrfect Detective: Solving Mysteries with the Clueless Kitten Squad',
            id: 9,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/252/251',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Author McAuthory'
        },
        {
            title: 'Kitten IQ Test: Are You Smarter Than Your Whiskered Companion?',
            id: 10,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/250/252',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Author McAuthory'
        },
        {
            title: `The Catnip Chronicles: Tales of Kittens' Hilarious and Trippy Adventures`,
            id: 11,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/251/260',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Writer Writterson'
        },
        {
            title: `Kitten Celebrity Gossip: Who's Dating Whom in the Glamorous Feline World`,
            id: 12,
            url: 'https://www.google.com',
            publishDate: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            image: 'https://placekitten.com/240/251',
            readTime: `${Math.floor(Math.random() * 10)} min read`,
            author: 'Author McAuthory'
        }
    ];

    React.useEffect(() => {
        if (collection) {
            // fetch collection data
            const postData = mockPosts;
            setPosts(postData);
        }
    }, [collection]);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    const handleCollectionChange = (value) => {
        // TODO: need to refresh the collection data - so we need to make a content API request here
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.collection = {id: value};
        });
    };

    const handleLayoutChange = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.layout = value;
        });
    };

    const handleColumnChange = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.columns = parseInt(value);
        });
    };

    const handlePostCountChange = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.postCount = value;
        });
    };

    return (
        <>
            <CollectionCard
                collection={collection}
                columns={columns}
                handleCollectionChange={handleCollectionChange}
                handleColumnChange={handleColumnChange}
                handleLayoutChange={handleLayoutChange}
                handlePostCountChange={handlePostCountChange}
                isEditing={isEditing}
                layout={layout}
                postCount={postCount}
                posts={posts}
            />
            <ActionToolbar
                data-kg-card-toolbar="collection"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="collection"
                isVisible={isSelected && !isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-collection-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Create snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}