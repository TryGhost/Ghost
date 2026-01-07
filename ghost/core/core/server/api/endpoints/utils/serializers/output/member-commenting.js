const membersSerializer = require('./members');

module.exports = {
    disable: membersSerializer.edit,
    enable: membersSerializer.edit
};
