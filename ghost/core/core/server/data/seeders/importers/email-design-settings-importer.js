const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

class EmailDesignSettingsImporter extends TableImporter {
    static table = 'email_design_settings';
    static dependencies = [];
    defaultQuantity = 1;

    constructor(knex, transaction) {
        super(EmailDesignSettingsImporter.table, knex, transaction);
        this.generatedCount = 0;
    }

    generate() {
        const id = this.fastFakeObjectId();
        const timestamp = dateToDatabaseString(faker.date.recent({days: 365}));
        const slug = this.generatedCount === 0 ? 'default-automated-email' : `generated-${id}`;
        this.generatedCount += 1;

        return {
            id,
            slug,
            background_color: 'light',
            header_background_color: 'transparent',
            header_image: null,
            show_header_icon: true,
            show_header_title: true,
            footer_content: null,
            button_color: 'accent',
            button_corners: 'rounded',
            button_style: 'fill',
            link_color: 'accent',
            link_style: 'underline',
            body_font_category: 'sans_serif',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            image_corners: 'square',
            divider_color: null,
            section_title_color: null,
            show_badge: true,
            sender_name: 'Generated sender',
            sender_email: 'generated@example.com',
            sender_reply_to: 'generated@example.com',
            created_at: timestamp,
            updated_at: timestamp
        };
    }
}

module.exports = EmailDesignSettingsImporter;
