const papaparse = require('papaparse');
const _ = require('lodash');

const RevueImporter = {
    type: 'revue',
    preProcess: function (importData) {
        importData.preProcessedByRevue = true;

        const posts = [];

        if (!importData?.revue?.revue?.issues) {
            return importData;
        }

        const csvData = papaparse.parse(importData.revue.revue.issues, {header: true});
        // const jsonData = importData.revue.revue.items;

        csvData.data.forEach((postMeta) => {
            // Convert issues to posts
            if (!postMeta.subject) {
                return;
            }

            const isPublished = (postMeta.sent_at) ? true : false; // This is how we determine is a post is published or not
            const postDate = (isPublished) ? new Date(postMeta.sent_at) : new Date();
            const revuePostID = postMeta.id;
            let postHTML = postMeta.description;

            // const postItems = _.filter(jsonData, {issue_id: revuePostID});
            // const sortedPostItems = (postItems) ? _.sortBy(postItems, o => o.order) : [];
            // if (postItems) {
            //     const convertedItems = convertItemToHTML(sortedPostItems);
            //     postHTML = `${postMeta.description}${convertedItems}`;
            // }

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

        importData.data.meta = {version: '5.0.0'};
        importData.data.data = {
            posts
        };

        return importData;
    },
    doImport: function (importData) {
        return importData;
    }
};

module.exports = RevueImporter;
