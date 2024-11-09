export class PostListPage {
    postListPage = "/ghost/#/posts";

    visit() {
        cy.visit(this.postListPage);
        cy.wait(1000);
    }

    getPostFromList(title) {
        return cy
            .get(".gh-posts-list-item-group .gh-content-entry-title")
            .contains(title)
            .parents(".gh-post-list-title");
    }

    getPostStatus(post) {
        return post.find(".gh-content-entry-status > span");
    }
}
