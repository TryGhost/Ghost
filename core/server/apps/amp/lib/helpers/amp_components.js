// # Amp Component Helper
// Usage: `{{amp_component}}`
//
// Reads through the AMP HTML and adds neccessary scripts
// for each extended component
var hbs             = require('express-hbs'),
    ampComponent;

ampComponent = function () {
    // var root = options.data.root;
    // console.log('root:', root);

    // <script async custom-element="amp-iframe" src="https://cdn.ampproject.org/v0/amp-iframe-0.1.js"></script>
    // <script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script>
    // <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>

    return new hbs.handlebars.SafeString(this.html);
};

module.exports = ampComponent;
