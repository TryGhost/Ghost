import { HomePage } from "./pages/homePage";

describe("Home feature", () => {
    it("should redirect to University page", () => {
        // Given
        cy.log("Given the user is on the template page");
        const homePage = new HomePage();
        homePage.visit();

        // When
        cy.log("When the user selects a university");
        homePage.clickFirstUniversity();

        // Then
        cy.log("Then the user should be redirected to the University page");
        cy.contains("Busca un profesor o materia (Uniandes)").should(
            "be.visible"
        );
    });
});
