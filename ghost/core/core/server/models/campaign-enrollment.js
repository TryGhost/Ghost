const ghostBookshelf = require('./base');

const CampaignEnrollment = ghostBookshelf.Model.extend({
    tableName: 'campaign_enrollments',
    hasTimestamps: true,

    defaults() {
        return {
            status: 'active',
            current_step: 0,
            enrolled_campaign_version: 1
        };
    },

    member() {
        return this.belongsTo('Member', 'member_id');
    }
});

const CampaignEnrollments = ghostBookshelf.Collection.extend({
    model: CampaignEnrollment
});

module.exports = {
    CampaignEnrollment: ghostBookshelf.model('CampaignEnrollment', CampaignEnrollment),
    CampaignEnrollments: ghostBookshelf.collection('CampaignEnrollments', CampaignEnrollments)
};
