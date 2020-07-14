module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        const unsplashSetting = await knex('settings')
            .select('value')
            .where({
                key: 'unsplash'
            })
            .first();

        let isActive;
        try {
            const value = JSON.parse(unsplashSetting.value);
            isActive = typeof value.isActive === 'boolean' ? value.isActive : true;
        } catch (err) {
            isActive = true;
        }

        await knex('settings')
            .update({
                group: 'unsplash',
                type: 'boolean',
                flags: null,
                value: isActive.toString()
            })
            .where({
                key: 'unsplash_is_active'
            });

        await knex('settings')
            .where({
                key: 'unsplash'
            })
            .del();
    },

    async down({transacting: knex}) {
        const unsplashSetting = await knex('settings')
            .select('value')
            .where({
                key: 'unsplash_is_active'
            })
            .first();

        const value = unsplashSetting && unsplashSetting.value || 'true';
        const isActive = value === 'true' ? true : false;

        const now = await knex.raw('CURRENT_TIMESTAMP');

        await knex('settings')
            .insert({
                group: 'unsplash',
                type: 'object',
                flags: null,
                value: JSON.stringify({isActive}),
                created_by: 1,
                created_at: now,
                updated_by: 1,
                updated_at: now
            })
            .where({
                key: 'unsplash'
            });

        await knex('setting')
            .where({
                key: 'unsplash_is_active'
            })
            .del();
    }
};
