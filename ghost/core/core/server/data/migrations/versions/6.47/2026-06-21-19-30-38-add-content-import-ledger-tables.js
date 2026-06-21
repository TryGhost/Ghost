const {addTable, combineNonTransactionalMigrations} = require('../../utils');

const contentImports = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: false},
    started_at: {type: 'dateTime', nullable: true},
    finished_at: {type: 'dateTime', nullable: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'pending', validations: {isIn: [['pending', 'running', 'completed', 'failed']]}},
    source_filename: {type: 'string', maxlength: 255, nullable: true},
    source_path: {type: 'string', maxlength: 2000, nullable: false},
    mapping: {type: 'text', maxlength: 65535, nullable: true},
    user_id: {type: 'string', maxlength: 24, nullable: false, references: 'users.id'},
    '@@INDEXES@@': [
        ['status', 'updated_at']
    ]
};

const contentImportRows = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    import_id: {type: 'string', maxlength: 24, nullable: false, references: 'content_imports.id', cascadeDelete: true},
    source_index: {type: 'integer', nullable: false, unsigned: true},
    original_data: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: false},
    outcome: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'pending', validations: {isIn: [['pending', 'created', 'updated', 'skipped', 'failed']]}},
    reason: {type: 'string', maxlength: 2000, nullable: true},
    warnings: {type: 'text', maxlength: 65535, nullable: true},
    post_id: {type: 'string', maxlength: 24, nullable: true, references: 'posts.id', setNullDelete: true},
    resulting_url: {type: 'string', maxlength: 2000, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: false},
    '@@INDEXES@@': [
        ['import_id', 'outcome']
    ],
    '@@UNIQUE_CONSTRAINTS@@': [
        ['import_id', 'source_index']
    ]
};

module.exports = combineNonTransactionalMigrations(
    addTable('content_imports', contentImports),
    addTable('content_import_rows', contentImportRows)
);
