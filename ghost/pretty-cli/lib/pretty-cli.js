const Api = require('sywac/api');
const styles = require('./styles');
const ui = require('./ui');
/**
 * Pretty CLI
 *
 * A mini-module to style a sywac instance in a standard way
 */

// Exports a pre-configured version of sywac
module.exports = Api.get()
// Use help & version with short forms AND
// group them into a Global Options group to keep them separate from per-command options
    .help('-h, --help', {group: 'Global Options:'})
    .version('-v, --version', {group: 'Global Options:'})
    // Load our style rules
    .style(styles)
    // Add some padding at the end
    .epilogue(' ')
    // If no command is passed, output the help menu
    .showHelpByDefault();

// Expose a clean version, just in case
module.exports.Api = Api;

// Export the styles
module.exports.styles = styles;

// Export our ui tools
module.exports.ui = ui;
