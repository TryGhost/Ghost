import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {DateTime} from 'luxon';

export function renderCollectionNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const htmlString = cardTemplate(node);

    const element = document.createElement('div');
    element.innerHTML = htmlString?.trim();

    return {element: element.firstElementChild};
}

function cardTemplate(node) {
    const {collection, postCount, layout, columns, header} = node.getDataset();

    // we need to fetch and pass in post data to the renderer; unclear how we will implement this
    //  so for now, we'll just push in some test data
    const posts = testPostData.slice(0, postCount);

    const cardClass = 'kg-card kg-collection-card'
        + (layout === 'grid' ? ' kg-width-wide' : '');
    const headerClass = 'kg-collection-card-title';
    const collectionClass = 'kg-collection-card-feed'
        + (layout === 'list' ? ' kg-collection-card-list' : ' kg-collection-card-grid')
        + ((layout === 'grid' && columns === 1) ? ' columns-1' : '')
        + ((layout === 'grid' && columns === 2) ? ' columns-2' : '')
        + ((layout === 'grid' && columns === 3) ? ' columns-3' : '')
        + ((layout === 'grid' && columns === 4) ? ' columns-4' : '');

    return (
        `<div class="${cardClass}" data-kg-collection-slug="${collection}" data-kg-collection-limit="${postCount}">
            <h4 class="${headerClass}">${header}</h4>
            <div class="${collectionClass}">
                ${posts.map(post => postTemplate(post, layout, columns)).join('')}
            </div>
        </div>`
    );
}

function postTemplate(post, layout, columns) {
    const {title, published_at: publishDate, excerpt, feature_image: image, reading_time: readTime} = post;

    const imageWrapperClass = 'kg-collection-card-img';
    const imageClass = '' 
        + ((layout === 'grid' && (columns === 1 || columns === 2)) ? ' aspect-video' : ' aspect-[3/2]')
        + (image === null ? ' invisible' : '');
    const titleClass = 'kg-collection-card-post-title';
    const excerptClass = 'kg-collection-card-post-excerpt';
    const metaClass = 'kg-collection-card-post-meta';

    return (
        `<div class="kg-collection-card-post">
            ${image && 
                `<div class=${imageWrapperClass}>
                    <img class=${imageClass} src="${image}" alt="${title}" />
                </div>`}
            <div class="kg-collection-card-content">
                <h2 class=${titleClass}>${title}</h2>
                <p class=${excerptClass}>${excerpt}</p>
                <div class=${metaClass}>
                    ${publishDate && `<p>${DateTime.fromISO(publishDate).toFormat('d LLL yyyy')}</p>`}
                    ${readTime > 0 ? `<p>&nbsp;&middot; ${readTime} min</p>` : ''}
                </div>
            </div>
        </div>`
    );
}

const testPostData = [
    {
        title: 'The Secret Life of Kittens: Uncovering Their Mischievous Master Plans',
        id: 1,
        url: 'https://www.google.com',
        published_at: '2023-07-08T16:26:13.846-05:00',
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/230/250',
        reading_time: 3,
        author: 'Author McAuthory'
    },
    {
        title: 'Kittens Gone Wild: Epic Adventures of Feline Daredevils',
        id: 2,
        url: 'https://www.google.com',
        published_at: '2023-08-17T16:26:13.858-05:00',
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/251/250',
        reading_time: 5,
        author: 'Writer Writterson'
    },
    {
        title: 'The Kitten Olympics: Hilarious Competitions and Paw-some Winners',
        id: 3,
        url: 'https://www.google.com',
        published_at: '2023-09-11T16:26:13.858-05:00',
        excerpt: 'Lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet lorem ipsum dolor amet',
        feature_image: 'https://placekitten.com/249/251',
        reading_time: 9,
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