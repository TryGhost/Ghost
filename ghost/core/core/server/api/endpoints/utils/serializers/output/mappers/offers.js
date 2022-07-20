const utils = require('../../../index');

module.exports = (model, frame) => {
    // Offer data is already returned as json via members service
    const jsonModel = model;

    if (utils.isContentAPI(frame)) {
        const serialized = {
            id: jsonModel.id,
            name: jsonModel.name,
            display_title: jsonModel.display_title,
            display_description: jsonModel.display_description,
            type: jsonModel.type,
            cadence: jsonModel.cadence,
            amount: jsonModel.amount,
            duration: jsonModel.duration,
            duration_in_months: jsonModel.duration_in_months,
            currency_restriction: jsonModel.currency_restriction,
            currency: jsonModel.currency,
            status: jsonModel.status,
            tier: jsonModel.tier
        };

        return serialized;
    }

    return jsonModel;
};
