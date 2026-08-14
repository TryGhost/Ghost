import BaseSerializer from './application';

export default BaseSerializer.extend({
    // make the label.count.members value dynamic
    serialize(labelModelOrCollection, request) {
        let updateMemberCount = (label) => {
            label.update('count', {members: label.memberIds.length});
        };

        if (this.isModel(labelModelOrCollection)) {
            updateMemberCount(labelModelOrCollection);
        } else {
            labelModelOrCollection.models.forEach(updateMemberCount);
        }

        return BaseSerializer.prototype.serialize.call(this, labelModelOrCollection, request);
    }
});
