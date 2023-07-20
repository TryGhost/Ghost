import {DateTime} from 'luxon';

export const useCollections = () => {
    const fetchCollectionPosts = async (collectionSlug) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(collections.find(collection => collection?.slug === collectionSlug)?.posts);
            }, 2000);
        });
    };

    const postData = [
        {
            title: 'The Secret Life of Kittens: Uncovering Their Mischievous Master Plans',
            id: 1,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.floor(Math.random() * 100)}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/230/250',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Author McAuthory'
        },
        {
            title: 'Kittens Gone Wild: Epic Adventures of Feline Daredevils',
            id: 2,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/251/250',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Writer Writterson'
        },
        {
            title: 'The Kitten Olympics: Hilarious Competitions and Paw-some Winners',
            id: 3,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/249/251',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Author McAuthory'
        },
        {
            title: `Kitten Fashion Faux Paws: The Dos and Don'ts of Kitty Couture`,
            id: 4,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/245/250',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Author McAuthory'
        },
        {
            title: 'Kittens vs. Veggies: The Great Battle of Green Leafy Monsters',
            id: 5,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/251/255',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Writer Writterson'
        },
        {
            title: 'Kitten Karaoke Night: Unleashing the Musical Talents of Fluffy',
            id: 6,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/249/248',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Author McAuthory'
        },
        {
            title: `The Kitten's Guide to World Domination: Tips from Aspiring Dictators`,
            id: 7,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/248/250',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Author McAuthory'
        },
        {
            title: 'Kitten Yoga: Finding Inner Peace, One Stretch at a Time',
            id: 8,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/251/252',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Writer Writterson'
        },
        {
            title: 'The Purrfect Detective: Solving Mysteries with the Clueless Kitten Squad',
            id: 9,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/252/251',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Author McAuthory'
        },
        {
            title: 'Kitten IQ Test: Are You Smarter Than Your Whiskered Companion?',
            id: 10,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/250/252',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Author McAuthory'
        },
        {
            title: `The Catnip Chronicles: Tales of Kittens' Hilarious and Trippy Adventures`,
            id: 11,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/251/260',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Writer Writterson'
        },
        {
            title: `Kitten Celebrity Gossip: Who's Dating Whom in the Glamorous Feline World`,
            id: 12,
            url: 'https://www.google.com',
            published_at: DateTime.now().minus({days: Math.random() * 100}).toISO(),
            excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
            feature_image: 'https://placekitten.com/240/251',
            reading_time: Math.floor(Math.random() * 10),
            author: 'Author McAuthory'
        }
    ];

    const collections = [
        {
            title: 'Latest',
            slug: 'latest',
            posts: postData
        }, {
            title: 'Featured',
            slug: 'featured',
            posts: postData.slice(8, 11)
        }
    ];

    return {
        collections,
        fetchCollectionPosts
    };
};