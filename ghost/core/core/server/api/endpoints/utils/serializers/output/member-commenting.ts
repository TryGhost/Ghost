import membersSerializer from './members';

// module.exports required - using `export` causes the module to fail to register
// with the web framework as it's loaded via require()
module.exports = {
    disable: membersSerializer.edit,
    enable: membersSerializer.edit
};
