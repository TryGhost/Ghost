const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:posts');
const mappers = require('./mappers');
const papaparse = require('papaparse');
const tiersService = require('../../../../../services/tiers');

module.exports = {
    async all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }
        let posts = [];

        const tiersPage = await tiersService.api.browse({});
        const tiers = tiersPage.data?.map((model) => {
            const json = model.toJSON();
            return {
                id: json.id,
                name: json.name,
                slug: json.slug,
                active: json.status === 'active',
                welcome_page_url: json.welcomePageURL,
                visibility: json.visibility,
                trial_days: json.trialDays,
                description: json.description,
                type: json.type,
                currency: json.type === 'paid' ? json.currency?.toLowerCase() : null,
                monthly_price: json.monthlyPrice,
                yearly_price: json.yearlyPrice,
                created_at: json.createdAt,
                updated_at: json.updatedAt,
                monthly_price_id: null,
                yearly_price_id: null
            };
        }) || [];
        if (models.meta) {
            for (let model of models.data) {
                let post = await mappers.posts(model, frame, {tiers});
                posts.push(post);
            }
            frame.response = {
                posts,
                meta: models.meta
            };

            return;
        }
        let post = await mappers.posts(models, frame, {tiers});
        frame.response = {
            posts: [post]
        };
    },

    exportCSV(models, apiConfig, frame) {
        frame.response = papaparse.unparse(models.data);
    },

    bulkEdit(bulkActionResult, _apiConfig, frame) {
        frame.response = {
            bulk: {
                action: frame.data.action,
                meta: {
                    stats: {
                        successful: bulkActionResult.successful,
                        unsuccessful: bulkActionResult.unsuccessful
                    },
                    errors: bulkActionResult.errors,
                    unsuccessfulData: bulkActionResult.unsuccessfulData
                }
            }
        };
    },

    bulkDestroy(bulkActionResult, _apiConfig, frame) {
        frame.response = {
            bulk: {
                meta: {
                    stats: {
                        successful: bulkActionResult.successful,
                        unsuccessful: bulkActionResult.unsuccessful
                    },
                    errors: bulkActionResult.errors
                }
            }
        };
    }
};
