const _ = require('lodash');
const moment = require('moment-timezone');
const models = require('../../../models');

const findOrCreateLabels = async (labels, options) => {
    const existingLabels = [];
    const createdLabels = [];

    for (const label of labels) {
        const existingLabel = await models.Label.findOne({name: label.name});

        if (existingLabel) {
            existingLabels.push(existingLabel.toJSON());
        } else {
            try {
                const createdLabel = await models.Label.add(label, options);
                createdLabels.push(createdLabel.toJSON());
            } catch (error) {
                if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
                    // ignore if label already exists
                } else {
                    throw error;
                }
            }
        }
    }

    return {existingLabels, createdLabels};
};

const getUniqueMemberLabels = (members) => {
    const allLabels = [];

    members.forEach((member) => {
        const labels = (member.labels && member.labels.split(',')) || [];

        if (labels.length) {
            allLabels.push(...labels);
        }
    });

    return _.uniq(allLabels);
};

function serializeMemberLabels(labels) {
    if (_.isString(labels)) {
        if (labels === '') {
            return [];
        }

        return [{
            name: labels.trim()
        }];
    } else if (labels) {
        return labels.filter((label) => {
            return !!label;
        }).map((label) => {
            if (_.isString(label)) {
                return {
                    name: label.trim()
                };
            }
            return label;
        });
    }
    return [];
}

const handleImportSetLabels = async (labels, siteTimezone, options) => {
    const importSetLabels = serializeMemberLabels(labels);
    let importLabel;

    const {existingLabels, createdLabels} = await findOrCreateLabels(importSetLabels, options);

    // NOTE: an import label allows for imports to be "undone" via bulk delete
    if (createdLabels.length) {
        importLabel = createdLabels[0] && createdLabels[0];
    } else {
        const name = `Import ${moment().tz(siteTimezone).format('YYYY-MM-DD HH:mm')}`;
        const result = await findOrCreateLabels([{name}], options);

        const generatedLabel = result.createdLabels.length
            ? result.createdLabels[0]
            : result.existingLabels[0];
        importLabel = generatedLabel;
        importLabel.generated = true;

        createdLabels.push(generatedLabel);
    }

    return {
        importSetLabels: [...existingLabels, ...createdLabels],
        importLabel
    };
};

const handleMemberLabels = async (members, options) => {
    const memberLabels = serializeMemberLabels(getUniqueMemberLabels(members));

    return await findOrCreateLabels(memberLabels, options);
};

const handleAllLabels = async (labels, members, siteTimezone, options) => {
    let {
        importSetLabels,
        importLabel
    } = await handleImportSetLabels(labels, siteTimezone, options);

    const memberLabelsResult = await handleMemberLabels(members);

    const allLabels = [
        ...importSetLabels,
        ...memberLabelsResult.existingLabels,
        ...memberLabelsResult.createdLabels
    ];

    return {
        allLabels,
        importSetLabels,
        importLabel
    };
};

module.exports.handleAllLabels = handleAllLabels;
module.exports.serializeMemberLabels = serializeMemberLabels;
