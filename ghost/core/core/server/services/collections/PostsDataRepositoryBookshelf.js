class PostsDataRepositoryBookshelf {
    Post;

    /**
     * @param {Object} deps
     * @param {import('../../models/post')} deps.Post
     */
    constructor(deps) {
        this.Post = deps.Post;
    }

    /**
     * @param {string[]} ids
     * @returns {Promise<import('../../models/post')>}
     **/
    async getBulk(ids) {
        return await this.Post.fetchAll({
            filter: `id:[${ids.join(',')}]`
        });
    }
}

module.exports = PostsDataRepositoryBookshelf;
