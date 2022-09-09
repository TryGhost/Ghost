describe('Forms', () => {
    it('Asks to fill in member name', () => {
        cy.login({name: ''}).as('login');
        cy.mockComments(10).as('getComments');
        cy.mockAddComments().as('getComments');

        cy.visit(`/?ghostComments=${encodeURIComponent('/')}&styles=${encodeURIComponent('/main.css')}`);
        cy.wait(['@login', '@getComments', '@getCounts']);

        let mainForm = cy.iframe().find('[data-testid="main-form"]').should('exist');

        // Check name not visible
        mainForm.find('[data-testid="member-name"]').should('not.exist');

        mainForm = cy.iframe().find('[data-testid="main-form"]').should('exist');
        mainForm.click();

        // Check name not visible
        mainForm.find('[data-testid="member-name"]').should('not.exist');
        cy.popup('addDetailsPopup').should('exist');
    });

    it('Can open main form and post a comment', () => {
        cy.login().as('login');
        cy.mockComments(10).as('getComments');
        cy.mockAddComments().as('getComments');

        cy.visit(`/?ghostComments=${encodeURIComponent('/')}&styles=${encodeURIComponent('/main.css')}`);
        cy.wait(['@login', '@getComments', '@getCounts']);

        let mainForm = cy.iframe().find('[data-testid="main-form"]').should('exist');

        // Check name not visible
        mainForm.find('[data-testid="member-name"]').should('not.exist');

        mainForm = cy.iframe().find('[data-testid="main-form"]').should('exist');
        mainForm.click();

        // Check name visible
        mainForm.find('[data-testid="member-name"]').should('exist');

        const form = cy.iframe().find('[data-testid="main-form"]').find('[contenteditable="true"]');

        form.type('Hello world')
            .type('{cmd}{enter}');
    });

    it('Hides MainForm when replying', () => {
        cy.login().as('login');
        cy.mockComments(1).as('getComments');
        cy.mockAddComments().as('getComments');

        cy.visit(`/?ghostComments=${encodeURIComponent('/')}&styles=${encodeURIComponent('/main.css')}`);
        cy.wait(['@login', '@getComments', '@getCounts']);

        cy.iframe().find('[data-testid="main-form"]').should('exist').as('mainForm');

        cy.iframe()
            .find('[data-testid="comment-component"]').should('exist')
            .find('[data-testid="reply-button"]').click();

        cy.iframe().find('[data-testid="main-form"]').should('not.exist');
    });
});
