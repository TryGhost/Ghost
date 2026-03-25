const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('automated_emails', 'background_color', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'light'
    }),
    createAddColumnMigration('automated_emails', 'header_background_color', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'transparent'
    }),
    createAddColumnMigration('automated_emails', 'title_font_category', {
        type: 'string',
        maxlength: 191,
        nullable: false,
        defaultTo: 'sans_serif'
    }),
    createAddColumnMigration('automated_emails', 'title_font_weight', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'bold'
    }),
    createAddColumnMigration('automated_emails', 'body_font_category', {
        type: 'string',
        maxlength: 191,
        nullable: false,
        defaultTo: 'sans_serif'
    }),
    createAddColumnMigration('automated_emails', 'title_alignment', {
        type: 'string',
        maxlength: 191,
        nullable: false,
        defaultTo: 'center'
    }),
    createAddColumnMigration('automated_emails', 'section_title_color', {
        type: 'string',
        maxlength: 50,
        nullable: true
    }),
    createAddColumnMigration('automated_emails', 'button_color', {
        type: 'string',
        maxlength: 50,
        nullable: true,
        defaultTo: 'accent'
    }),
    createAddColumnMigration('automated_emails', 'button_style', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'fill'
    }),
    createAddColumnMigration('automated_emails', 'button_corners', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'rounded'
    }),
    createAddColumnMigration('automated_emails', 'link_color', {
        type: 'string',
        maxlength: 50,
        nullable: true,
        defaultTo: 'accent'
    }),
    createAddColumnMigration('automated_emails', 'link_style', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'underline'
    }),
    createAddColumnMigration('automated_emails', 'image_corners', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'square'
    }),
    createAddColumnMigration('automated_emails', 'divider_color', {
        type: 'string',
        maxlength: 50,
        nullable: true
    }),
    createAddColumnMigration('automated_emails', 'header_image', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('automated_emails', 'show_header_title', {
        type: 'boolean',
        nullable: false,
        defaultTo: true
    }),
    createAddColumnMigration('automated_emails', 'show_badge', {
        type: 'boolean',
        nullable: false,
        defaultTo: true
    }),
    createAddColumnMigration('automated_emails', 'footer_content', {
        type: 'text',
        maxlength: 1000000000,
        nullable: true
    })
);
