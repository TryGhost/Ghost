describe('Pagination', () => {
    it('does not show pagination button for 0 comments', () => {
        cy.login().as('login');
        cy.mockComments(0).as('getComments');

        cy.visit(`/?ghostComments=${encodeURIComponent('/')}&styles=${encodeURIComponent('/main.css')}`);
        cy.wait(['@login', '@getComments', '@getCounts']);

        cy.iframe().find('[data-testid="pagination-component"]').should('not.exist');
    });

    it('does show pagination plural', () => {
        cy.login().as('login');
        cy.mockComments(12).as('getComments');

        cy.visit(`/?ghostComments=${encodeURIComponent('/')}&styles=${encodeURIComponent('/main.css')}`);
        cy.wait(['@login', '@getComments', '@getCounts']);

        const button = cy.iframe().find('[data-testid="pagination-component"]').should('exist');
        button.contains('Show 7 previous comments');

        // Should show 5 comments
        cy.iframe().find('[data-testid="comment-component"]').should('have.length', 5);
    });

    it('does show pagination singular', () => {
        cy.login().as('login');
        cy.mockComments(6).as('getComments');

        cy.visit(`/?ghostComments=${encodeURIComponent('/')}&styles=${encodeURIComponent('/main.css')}`);
        cy.wait(['@login', '@getComments', '@getCounts']);

        cy.iframe().contains('Show 1 previous comment');

        // Should show 5 comments
        cy.iframe().find('[data-testid="comment-component"]').should('have.length', 5);
    });

    it('can load next page', () => {
        cy.login().as('login');
        cy.mockComments(6).as('getComments');

        cy.visit(`/?ghostComments=${encodeURIComponent('/')}&styles=${encodeURIComponent('/main.css')}`);
        cy.wait(['@login', '@getComments', '@getCounts']);

        const button = cy.iframe().contains('Show 1 previous comment');

        // Should show 5 comments
        cy.iframe().find('[data-testid="comment-component"]').should('have.length', 5);

        button.click();
        cy.wait(['@getCommentsPage2']);

        // Button should be gone
        button.should('not.exist');

        // Should show 6 comments now, instead of 5
        cy.iframe().find('[data-testid="comment-component"]').should('have.length', 6);
    });
});
