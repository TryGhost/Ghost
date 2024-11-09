export class ProfileStaff {

    clickProfile() {
        cy.get("button.ml-2.inline-block.text-sm.font-bold.text-green").click();
        cy.wait(1000);
    }

    clickAdminSetting() {
        cy.get(".ember-view.gh-nav-bottom-tabicon").click();
        cy.wait(1000);
    }

    verifyProfile() {
        cy.get('.text-md.font-semibold.capitalize.text-white')
            .invoke('text')
            .then((elementText) => {
                expect(elementText.trim()).to.equal('Owner');
            });
    }


}
