var db = {
        posts: {
            id: {type: 'increments', nullable: false, primary: true},
            uuid: {type: 'string', maxlength: 36, nullable: false, validations: {'isUUID': true}},
            title: {type: 'string', maxlength: 150, nullable: false},
            slug: {type: 'string', maxlength: 150, nullable: false, unique: true},
            markdown: {type: 'text', maxlength: 16777215, fieldtype: 'medium', nullable: true},
            html: {type: 'text', maxlength: 16777215, fieldtype: 'medium', nullable: true},
            image: {type: 'text', maxlength: 2000, nullable: true},
            featured: {type: 'bool', nullable: false, defaultTo: false},
            page: {type: 'bool', nullable: false, defaultTo: false, validations: {'isIn': [['0', '1']]}},
            status: {type: 'string', maxlength: 150, nullable: false, defaultTo: 'draft'},
            language: {type: 'string', maxlength: 6, nullable: false, defaultTo: 'en_US'},
            meta_title: {type: 'string', maxlength: 150, nullable: true},
            meta_description: {type: 'string', maxlength: 200, nullable: true},
            author_id: {type: 'integer', nullable: false},
            created_at: {type: 'dateTime', nullable: false},
            created_by: {type: 'integer', nullable: false},
            updated_at: {type: 'dateTime', nullable: true},
            updated_by: {type: 'integer', nullable: true},
            published_at: {type: 'dateTime', nullable: true},
            published_by: {type: 'integer', nullable: true}
        },
        users: {
            id: {type: 'increments', nullable: false, primary: true},
            uuid: {type: 'string', maxlength: 36, nullable: false, validations: {'isUUID': true}},
            name: {type: 'string', maxlength: 150, nullable: false, unique: true},
            slug: {type: 'string', maxlength: 150, nullable: false},
            password: {type: 'string', maxlength: 60, nullable: false},
            email: {type: 'string', maxlength: 254, nullable: false, unique: true, validations: {'isEmail': true}},
            image: {type: 'text', maxlength: 2000, nullable: true},
            cover: {type: 'text', maxlength: 2000, nullable: true},
            bio: {type: 'string', maxlength: 200, nullable: true},
            website: {type: 'text', maxlength: 2000, nullable: true, validations: {'isURL': true}},
            location: {type: 'text', maxlength: 65535, nullable: true},
            accessibility: {type: 'text', maxlength: 65535, nullable: true},
            status: {type: 'string', maxlength: 150, nullable: false, defaultTo: 'active'},
            language: {type: 'string', maxlength: 6, nullable: false, defaultTo: 'en_US'},
            meta_title: {type: 'string', maxlength: 150, nullable: true},
            meta_description: {type: 'string', maxlength: 200, nullable: true},
            last_login: {type: 'dateTime', nullable: true},
            created_at: {type: 'dateTime', nullable: false},
            created_by: {type: 'integer', nullable: false},
            updated_at: {type: 'dateTime', nullable: true},
            updated_by: {type: 'integer', nullable: true}
        },
        roles: {
            id: {type: 'increments', nullable: false, primary: true},
            uuid: {type: 'string', maxlength: 36, nullable: false, validations: {'isUUID': true}},
            name: {type: 'string', maxlength: 150, nullable: false},
            description: {type: 'string', maxlength: 200, nullable: true},
            created_at: {type: 'dateTime',  nullable: false},
            created_by: {type: 'integer',  nullable: false},
            updated_at: {type: 'dateTime',  nullable: true},
            updated_by: {type: 'integer',  nullable: true}
        },
        roles_users: {
            id: {type: 'increments', nullable: false, primary: true},
            role_id: {type: 'integer', nullable: false},
            user_id: {type: 'integer', nullable: false}
        },
        permissions: {
            id: {type: 'increments', nullable: false, primary: true},
            uuid: {type: 'string', maxlength: 36, nullable: false, validations: {'isUUID': true}},
            name: {type: 'string', maxlength: 150, nullable: false},
            object_type: {type: 'string', maxlength: 150, nullable: false},
            action_type: {type: 'string', maxlength: 150, nullable: false},
            object_id: {type: 'integer', nullable: true},
            created_at: {type: 'dateTime', nullable: false},
            created_by: {type: 'integer', nullable: false},
            updated_at: {type: 'dateTime', nullable: true},
            updated_by: {type: 'integer', nullable: true}
        },
        permissions_users: {
            id: {type: 'increments', nullable: false, primary: true},
            user_id: {type: 'integer', nullable: false},
            permission_id: {type: 'integer', nullable: false}
        },
        permissions_roles: {
            id: {type: 'increments', nullable: false, primary: true},
            role_id: {type: 'integer', nullable: false},
            permission_id: {type: 'integer', nullable: false}
        },
        sessions: {
            id: {type: 'string', nullable: false, primary: true},
            expires: {type: 'bigInteger', nullable: false},
            sess: {type: 'string', maxlength: 4096, nullable: false}
        },
        settings: {
            id: {type: 'increments', nullable: false, primary: true},
            uuid: {type: 'string', maxlength: 36, nullable: false, validations: {'isUUID': true}},
            key: {type: 'string', maxlength: 150, nullable: false, unique: true},
            value: {type: 'text', maxlength: 65535, nullable: true},
            type: {type: 'string', maxlength: 150, nullable: false, defaultTo: 'core', validations: {'isIn': [['core', 'blog', 'theme', 'app', 'plugin']]}},
            created_at: {type: 'dateTime', nullable: false},
            created_by: {type: 'integer', nullable: false},
            updated_at: {type: 'dateTime', nullable: true},
            updated_by: {type: 'integer', nullable: true}
        },
        tags: {
            id: {type: 'increments', nullable: false, primary: true},
            uuid: {type: 'string', maxlength: 36, nullable: false, validations: {'isUUID': true}},
            name: {type: 'string', maxlength: 150, nullable: false},
            slug: {type: 'string', maxlength: 150, nullable: false, unique: true},
            description: {type: 'string', maxlength: 200, nullable: true},
            parent_id: {type: 'integer', nullable: true},
            meta_title: {type: 'string', maxlength: 150, nullable: true},
            meta_description: {type: 'string', maxlength: 200, nullable: true},
            created_at: {type: 'dateTime', nullable: false},
            created_by: {type: 'integer', nullable: false},
            updated_at: {type: 'dateTime', nullable: true},
            updated_by: {type: 'integer', nullable: true}
        },
        posts_tags: {
            id: {type: 'increments', nullable: false, primary: true},
            post_id: {type: 'integer', nullable: false, unsigned: true, references: 'id', inTable: 'posts'},
            tag_id: {type: 'integer', nullable: false, unsigned: true, references: 'id', inTable: 'tags'}
        }
    };

function isPost(jsonData) {
    return jsonData.hasOwnProperty('html') && jsonData.hasOwnProperty('markdown')
        && jsonData.hasOwnProperty('title') && jsonData.hasOwnProperty('slug');
}

function isTag(jsonData) {
    return jsonData.hasOwnProperty('name') && jsonData.hasOwnProperty('slug')
        && jsonData.hasOwnProperty('description') && jsonData.hasOwnProperty('parent_id');
}

module.exports.tables = db;
module.exports.checks = {
    isPost: isPost,
    isTag: isTag
};
