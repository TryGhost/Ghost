const { defineConfig } = require("cypress");

module.exports = defineConfig({
    projectId: "ghost-cypress",
    e2e: {
        baseUrl: "https://losestudiantes.com",
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
    },
});
