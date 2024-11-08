const { defineConfig } = require("cypress");

module.exports = defineConfig({
    projectId: "ghost-cypress",
    e2e: {
        baseUrl: "http://localhost:2368",
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
    },
});
