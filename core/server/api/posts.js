var when                   = require('when'),
    _                      = require('lodash'),
    dataProvider           = require('../models'),
    canThis                = require('../permissions').canThis,

    posts,
    allowedIncludes        = ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'fields'];

function checkPostData(postData) {
    if (_.isEmpty(postData) || _.isEmpty(postData.posts) || _.isEmpty(postData.posts[0])) {
        return when.reject({type: 'BadRequest', message: 'No root key (\'posts\') provided.'});
    }
    return when.resolve(postData);
}

function prepareInclude(include) {
    var index;

    include = _.intersection(include.split(","), allowedIncludes);
    index = include.indexOf('author');

    if (index !== -1) {
        include[index] = 'author_id';
    }

    return include;
}

// ## Posts
posts = {

    // #### Browse
    // **takes:** filter / pagination parameters
    browse: function browse(options) {
        options = options || {};
        
        // only published posts if no user is present
        if (!this.user) {
            options.status = 'published';
        }

        if (options.include) {
            options.include = prepareInclude(options.include);
        }

        // **returns:** a promise for a page of posts in a json object
        return dataProvider.Post.findPage(options);
    },

    // #### Read
    // **takes:** an identifier (id or slug?)
    read: function read(options) {
        var include;
        options = options || {};

        // only published posts if no user is present
        if (!this.user) {
            options.status = 'published';
        }

        if (options.include) {
            include = prepareInclude(options.include);
            delete options.include;
        }

        // **returns:** a promise for a single post in a json object
        return dataProvider.Post.findOne(options, {include: include}).then(function (result) {
            if (result) {
                return { posts: [ result.toJSON() ]};
            }

            return when.reject({type: 'NotFound', message: 'Post not found.'});

        });
    },

    // #### Edit
    // **takes:** a json object with all the properties which should be updated
    edit: function edit(postData) {
        // **returns:** a promise for the resulting post in a json object
        var self = this,
            include;

        return canThis(self.user).edit.post(postData.id).then(function () {
            return checkPostData(postData).then(function (checkedPostData) {

                if (postData.include) {
                    include = prepareInclude(postData.include);
                }

                return dataProvider.Post.edit(checkedPostData.posts[0], {user: self.user, include: include});
            }).then(function (result) {
                if (result) {
                    var post = result.toJSON();

                    // If previously was not published and now is, signal the change
                    if (result.updated('status') !== result.get('status')) {
                        post.statusChanged = true;
                    }
                    return { posts: [ post ]};
                }

                return when.reject({type: 'NotFound', message: 'Post not found.'});
            });
        }, function () {
            return when.reject({type: 'NoPermission', message: 'You do not have permission to edit this post.'});
        });
    },

    // #### Add
    // **takes:** a json object representing a post,
    add: function add(postData) {
        var self = this,
            include;

        // **returns:** a promise for the resulting post in a json object
        return canThis(this.user).create.post().then(function () {
            return checkPostData(postData).then(function (checkedPostData) {
                if (postData.include) {
                    include = prepareInclude(postData.include);
                }

                return dataProvider.Post.add(checkedPostData.posts[0], {user: self.user, include: include});
            }).then(function (result) {
                var post = result.toJSON();

                if (post.status === 'published') {
                    // When creating a new post that is published right now, signal the change
                    post.statusChanged = true;
                }
                return { posts: [ post ]};
            });
        }, function () {
            return when.reject({type: 'NoPermission', message: 'You do not have permission to add posts.'});
        });
    },

    // #### Destroy
    // **takes:** an identifier (id or slug?)
    destroy: function destroy(args) {
        var self = this;
        // **returns:** a promise for a json response with the id of the deleted post
        return canThis(this.user).remove.post(args.id).then(function () {
            // TODO: Would it be good to get rid of .call()?
            return posts.read.call({user: self.user}, {id : args.id, status: 'all'}).then(function (result) {
                return dataProvider.Post.destroy(args.id).then(function () {
                    var deletedObj = result;

                    if (deletedObj.posts) {
                        _.each(deletedObj.posts, function (post) {
                            post.statusChanged = true;
                        });
                    }

                    return deletedObj;
                });
            });
        }, function () {
            return when.reject({type: 'NoPermission', message: 'You do not have permission to remove posts.'});
        });
    },

    // #### Generate slug
    // **takes:** a string to generate the slug from
    generateSlug: function generateSlug(args) {

        return canThis(this.user).slug.post().then(function () {
            return dataProvider.Base.Model.generateSlug(dataProvider.Post, args.title, {status: 'all'}).then(function (slug) {
                if (slug) {
                    return slug;
                }
                return when.reject({type: 'InternalServerError', message: 'Could not generate slug'});
            });
        }, function () {
            return when.reject({type: 'NoPermission', message: 'You do not have permission.'});
        });
    }

};

module.exports = posts;