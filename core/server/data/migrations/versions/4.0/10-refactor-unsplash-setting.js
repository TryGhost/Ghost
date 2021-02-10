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

    async down() {
        // this is a major version migration, so there is no need for back compatibility
        // less code - less scenarios to think about
    }
};
