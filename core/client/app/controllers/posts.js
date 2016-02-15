import Ember from 'ember';

const {Controller, compare, computed} = Ember;
const {equal} = computed;

// a custom sort function is needed in order to sort the posts list the same way the server would:
//     status: ASC
//     publishedAt: DESC
//     updatedAt: DESC
//     id: DESC
function comparator(item1, item2) {
    let updated1 = item1.get('updatedAt');
    let updated2 = item2.get('updatedAt');
    let idResult,
        publishedAtResult,
        statusResult,
        updatedAtResult;

    // when `updatedAt` is undefined, the model is still
    // being written to with the results from the server
    if (item1.get('isNew') || !updated1) {
        return -1;
    }

    if (item2.get('isNew') || !updated2) {
        return 1;
    }

    idResult = compare(parseInt(item1.get('id')), parseInt(item2.get('id')));
    statusResult = compare(item1.get('status'), item2.get('status'));
    updatedAtResult = compare(updated1.valueOf(), updated2.valueOf());
    publishedAtResult = publishedAtCompare(item1, item2);

    if (statusResult === 0) {
        if (publishedAtResult === 0) {
            if (updatedAtResult === 0) {
                // This should be DESC
                return idResult * -1;
            }
            // This should be DESC
            return updatedAtResult * -1;
        }
        // This should be DESC
        return publishedAtResult * -1;
    }

    return statusResult;
}

function publishedAtCompare(item1, item2) {
    let published1 = item1.get('publishedAt');
    let published2 = item2.get('publishedAt');

    if (!published1 && !published2) {
        return 0;
    }

    if (!published1 && published2) {
        return -1;
    }

    if (!published2 && published1) {
        return 1;
    }

    return compare(published1.valueOf(), published2.valueOf());
}

export default Controller.extend({

    showDeletePostModal: false,

    // See PostsRoute's shortcuts
    postListFocused: equal('keyboardFocus', 'postList'),
    postContentFocused: equal('keyboardFocus', 'postContent'),

    sortedPosts: computed('model.@each.status', 'model.@each.publishedAt', 'model.@each.isNew', 'model.@each.updatedAt', function () {
        let postsArray = this.get('model').toArray();

        return postsArray.sort(comparator);
    }),

    actions: {
        toggleDeletePostModal() {
            this.toggleProperty('showDeletePostModal');
        }
    }
});
