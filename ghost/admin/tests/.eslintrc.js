/* eslint-env node */
module.exports = {
    env: {
        'embertest': true,
        'mocha': true
    },
    globals: {
        server: false,
        expect: false,
        fileUpload: false,

        // ember-power-select test helpers
        selectChoose: false,
        selectSearch: false,
        removeMultipleOption: false,
        clearSelected: false,

        // ember-power-datepicker test helpers
        datepickerSelect: false
    }
};
