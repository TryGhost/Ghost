module.exports = function (ghostBookshelf) {
    const MemberNewsletter = ghostBookshelf.Model.extend({
        tableName: 'members_newsletters'
    });

    return {
        MemberNewsletter: ghostBookshelf.model('MemberNewsletter', MemberNewsletter)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
