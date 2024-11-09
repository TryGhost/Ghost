export class ProfileStaff {

    clickProfile() {
        cy.wait(1000);
        cy.get(".relative.inline-flex.select-none.items-center.justify-center.overflow-hidden.rounded-full.align-middle").click();
        cy.wait(1000);
    }

    clickAdminSetting() {
        cy.get(".ember-view.gh-nav-bottom-tabicon").click();
        cy.wait(1000);
    }

    clickSave() {
        cy.get("button.cursor-pointer.bg-black.text-white").click();
        cy.wait(1000);
       
    }

    getName(name) {
        cy.get('h1.text-white')
            .invoke('text')
            .then((elementText) => {
                expect(elementText.trim()).to.equal(name);
            });
    
    }

    setName(name) {
        cy.get('input.bg-transparent').first().clear().type(name);
        cy.wait(1000);
    }

    verifyProfile() {
        cy.get('.text-md.font-semibold.capitalize.text-white')
            .invoke('text')
            .then((elementText) => {
                expect(elementText.trim()).to.equal('owner');
            });
    }


}
