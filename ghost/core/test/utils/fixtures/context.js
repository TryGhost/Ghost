const DataGenerator = require('./data-generator');

module.exports = {
    internal: {context: {internal: true}},
    external: {context: {external: true}},
    owner: {context: {user: DataGenerator.Content.users[0].id}},
    admin: {context: {user: DataGenerator.Content.users[1].id}},
    editor: {context: {user: DataGenerator.Content.users[2].id}},
    author: {context: {user: DataGenerator.Content.users[3].id}},
    contributor: {context: {user: DataGenerator.Content.users[7].id}},
    super_editor: {context: {user: DataGenerator.Content.users[8].id}},
    admin_api_key: {context: {api_key: DataGenerator.Content.api_keys[0].id}},
    content_api_key: {context: {api_key: DataGenerator.Content.api_keys[1].id}}
};
