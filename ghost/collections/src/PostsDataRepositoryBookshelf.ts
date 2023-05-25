type PostsDataRepositoryBookshelfDeps = {
    Post: any;
}

export class PostsDataRepositoryBookshelf {
    Post;

    constructor(deps: PostsDataRepositoryBookshelfDeps) {
        this.Post = deps.Post;
    }

    async getBulk(ids: string[]) {
        return await this.Post.fetchAll({
            filter: `id:[${ids.join(',')}]`
        });
    }
}
