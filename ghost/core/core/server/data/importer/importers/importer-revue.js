const debug = require('@tryghost/debug')('importer:revue');
const {slugify} = require('@tryghost/string');
const papaparse = require('papaparse');
const _ = require('lodash');

const JSONToHTML = require('./json-to-html');

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

        const revuePostID = postMeta.id;
        let postHTML = JSONToHTML.cleanCsvHTML(postMeta.description);

        const postItems = _.filter(itemData, {issue_id: revuePostID});
        const sortedPostItems = _.sortBy(postItems, o => o.order);

        if (postItems) {
            const convertedItems = JSONToHTML.itemsToHtml(sortedPostItems);
            postHTML = `${postHTML}${convertedItems}`;
        }

        const postDate = JSONToHTML.getPostDate(postMeta);
        const postSlug = slugify(postMeta.subject).slice(0, 190);

        posts.push({
            comment_id: revuePostID,
            title: postMeta.subject,
            slug: postSlug,
            status: JSONToHTML.getPostStatus(postMeta),
            visibility: 'public',
            created_at: postDate,
            published_at: postDate,
            updated_at: postDate,
            html: postHTML
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
            created_at: subscriber.created_at,
            subscribed: true
        });
    });

    return subscribers;
};

const RevueImporter = {
    type: 'revue',
    preProcess: function (importData) {
        debug('preProcess');
        importData.preProcessedByRevue = true;

        // TODO: this should really be in doImport
        // No posts to prePprocess, return early
        if (!importData?.revue?.revue?.issues) {
            return importData;
        }

        // This processed data goes to the data importer
        importData.data = {
            meta: {version: '5.0.0'},
            data: {}
        };

        importData.data.data.posts = this.importPosts(importData.revue.revue);

        // No subscribers to import, we're done
        if (!importData?.revue?.revue?.subscribers) {
            return importData;
        }

        importData.data.data.revue_subscribers = this.importSubscribers(importData.revue.revue);

        return importData;
    },
    doImport: function (importData) {
        debug('doImport');

        return importData;
    },

    importPosts: fetchPostsFromData,
    importSubscribers: buildSubscriberList
};

module.exports = RevueImporter;
