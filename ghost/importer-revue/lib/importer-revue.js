const debug = require('@tryghost/debug')('importer:revue');
const papaparse = require('papaparse');
const _ = require('lodash');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);
const imageCard = require('@tryghost/kg-default-cards/lib/cards/image.js');
const bookmarkCard = require('@tryghost/kg-default-cards/lib/cards/bookmark.js');
const embedCard = require('@tryghost/kg-default-cards/lib/cards/embed.js');

// Take the array of items for a specific post and return the converted HTML
const convertItemToHTML = (items) => {
    let itemHTMLChunks = [];
    items.forEach((item) => {
        let type = item.item_type;
        if (type === 'header') {
            itemHTMLChunks.push(`<h3>${item.title}</h3>`);
        } else if (type === 'text') {
            itemHTMLChunks.push(item.description); // THis is basic text HTML with <p>, <b>, <a>, etc (no media)
        } else if (type === 'image') {
            // We have 2 values to work with here. `image` is smaller and most suitable, and `original_image_url` is the full-res that would need to be resized
            // - item.image (https://s3.amazonaws.com/revue/items/images/019/005/542/web/anita-austvika-C-JUrfmYqcw-unsplash.jpg?1667924147)
            // - item.original_image_url (https://s3.amazonaws.com/revue/items/images/019/005/542/original/anita-austvika-C-JUrfmYqcw-unsplash.jpg?1667924147)
            let cardOpts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    src: item.image,
                    caption: item.description
                }
            };

            itemHTMLChunks.push(serializer.serialize(imageCard.render(cardOpts)));
        } else if (type === 'link') {
            // Embedded link card
            let cardOpts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    url: item.url,
                    metadata: {
                        url: item.url,
                        title: item.title,
                        description: item.description,
                        thumbnail: item.image
                    }
                }
            };

            itemHTMLChunks.push(serializer.serialize(bookmarkCard.render(cardOpts)));
        } else if (type === 'tweet') {
            // Should this be an oEmbed call? Probably.
            itemHTMLChunks.push(`<figure class="kg-card kg-embed-card">
                <blockquote class="twitter-tweet"><a href="${item.url}"></a></blockquote>
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                </figure>`);
        } else if (type === 'video') {
            const isLongYouTube = /youtube.com/.test(item.url);
            const isShortYouTube = /youtu.be/.test(item.url);
            const isVimeo = /vimeo.com/.test(item.url);
            let videoHTML = '';
            if (isLongYouTube) {
                let videoID = item.url.replace(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]*)/gi, '$1');
                videoHTML = `<iframe width="200" height="113" src="https://www.youtube.com/embed/${videoID}?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            } else if (isShortYouTube) {
                let videoID = item.url.replace(/https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]*)/gi, '$1');
                videoHTML = `<iframe width="200" height="113" src="https://www.youtube.com/embed/${videoID}?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            } else if (isVimeo) {
                let videoID = item.url.replace(/vimeo.com\/([0-9]+)/gm, '$1');
                videoHTML = `<iframe src="https://player.vimeo.com/video/${videoID}" width="200" height="113" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
            }
            let cardOpts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    html: videoHTML,
                    caption: item.description
                }
            };

            itemHTMLChunks.push(serializer.serialize(embedCard.render(cardOpts)));
        } else {
            // This is all the cards we know about right now
        }
    });
    return itemHTMLChunks.join('\n');
};

/**
 * Build posts out of the issue and item data
 *
 * @param {Object} revueData
 * @return {Array}
 */
const fetchPostsFromData = (revueData) => {
    const itemData = JSON.parse(revueData.items);
    const issueData = papaparse.parse(revueData.issues, {
        header: true,
        skipEmptyLines: true,
        transform(value, header) {
            if (header === 'id') {
                return parseInt(value);
            }
            return value;
        }
    });

    const posts = [];

    issueData.data.forEach((postMeta) => {
        // Convert issues to posts
        if (!postMeta.subject) {
            return;
        }

        const isPublished = (postMeta.sent_at) ? true : false; // This is how we determine is a post is published or not
        const postDate = (isPublished) ? new Date(postMeta.sent_at) : new Date();
        const revuePostID = postMeta.id;
        let postHTML = postMeta.description;

        const postItems = _.filter(itemData, {issue_id: revuePostID});
        const sortedPostItems = (postItems) ? _.sortBy(postItems, o => o.order) : [];
        if (postItems) {
            const convertedItems = convertItemToHTML(sortedPostItems);
            postHTML = `${postMeta.description}${convertedItems}`;
        }

        posts.push({
            comment_id: revuePostID,
            title: postMeta.subject,
            status: (isPublished) ? 'published' : 'draft',
            visibility: 'public',
            created_at: postDate.toISOString(),
            published_at: postDate.toISOString(),
            updated_at: postDate.toISOString(),
            html: postHTML,
            tags: ['#revue']

        });
    });

    return posts;
};

/**
 *
 * @param {*} revueData
 */
const buildSubscriberList = (revueData) => {
    const subscribers = [];

    const subscriberData = papaparse.parse(revueData.subscribers, {
        header: true,
        skipEmptyLines: true
    });

    subscriberData.data.forEach((subscriber) => {
        subscribers.push({
            email: subscriber.email,
            name: `${subscriber.first_name} ${subscriber.last_name}`.trim(),
            created_at: subscriber.created_at

        });
    });

    return subscribers;
};

const RevueImporter = {
    type: 'revue',
    preProcess: function (importData) {
        debug('preProcess');
        importData.preProcessedByRevue = true;

        // This processed data goes to the data importer
        importData.data = {
            meta: {version: '5.0.0'},
            data: {}
        };

        // TODO: this should really be in doImport
        // No posts to process, quit early
        if (!importData?.revue?.revue?.issues) {
            return importData;
        }

        importData.data.data.posts = fetchPostsFromData(importData.revue.revue);

        // No subscribers to import, we're done
        if (!importData?.revue?.revue?.subscribers) {
            return importData;
        }

        importData.data.data.revue_subscribers = buildSubscriberList(importData.revue.revue);

        return importData;
    },
    doImport: function (importData) {
        debug('doImport');

        return importData;
    }
};

module.exports = RevueImporter;
