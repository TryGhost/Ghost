import Ember from 'ember';
import PaginationControllerMixin from 'ghost/mixins/pagination-controller';

// a custom sort function is needed in order to sort the posts list the same way the server would:
//     status: ASC
//     published_at: DESC
//     updated_at: DESC
//     id: DESC
function comparator(item1, item2) {
    var updated1 = item1.get('updated_at'),
        updated2 = item2.get('updated_at'),
        idResult,
        statusResult,
        updatedAtResult,
        publishedAtResult;

    // when `updated_at` is undefined, the model is still
    // being written to with the results from the server
    if (item1.get('isNew') || !updated1) {
        return -1;
    }

    if (item2.get('isNew') || !updated2) {
        return 1;
    }

    idResult = Ember.compare(parseInt(item1.get('id')), parseInt(item2.get('id')));
    statusResult = Ember.compare(item1.get('status'), item2.get('status'));
    updatedAtResult = Ember.compare(updated1.valueOf(), updated2.valueOf());
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
    var published1 = item1.get('published_at'),
        published2 = item2.get('published_at');

    if (!published1 && !published2) {
        return 0;
    }

    if (!published1 && published2) {
        return -1;
    }

    if (!published2 && published1) {
        return 1;
    }

    return Ember.compare(published1.valueOf(), published2.valueOf());
}

export default Ember.Controller.extend(PaginationControllerMixin, {
    // See PostsRoute's shortcuts
    postListFocused: Ember.computed.equal('keyboardFocus', 'postList'),
    postContentFocused: Ember.computed.equal('keyboardFocus', 'postContent'),

    sortedPosts: Ember.computed('model.@each.status', 'model.@each.published_at', 'model.@each.isNew', 'model.@each.updated_at', function () {
        var postsArray = this.get('model').toArray();

        return postsArray.sort(comparator);
    }),

    init: function () {
        // let the PaginationControllerMixin know what type of model we will be paginating
        // this is necessary because we do not have access to the model inside the Controller::init method
        this._super({modelType: 'post'});
    },

    actions: {
        showPostContent: function (post) {
            if (!post) {
                return;
            }

            this.transitionToRoute('posts.post', post);
        }
    }
});
