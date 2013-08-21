var when    = require('when'),
	knex    = require('../../models/base').Knex,
	migrationVersion = '003',
	errors = require('../../errorHandling'),
	up,
	down;

up = function () {
	return when.all([
      knex.Raw("CREATE VIRTUAL TABLE posts_search USING fts4(id, title, content, meta_title, meta_description, meta_keywords)")
		]).then(function () {

			// Once we create all of the initial tables, bootstrap any of the data
			return when.all([
				knex.Raw("INSERT INTO posts_search (id, title, content, meta_title, meta_description, meta_keywords) SELECT id, title, content, meta_title, meta_description, meta_keywords FROM posts")
			]);

		}).then(function () {
			// Lastly, update the current version settings to reflect this version
			return knex('settings')
				.where('key', 'currentVersion')
				.update({ 'value': migrationVersion });
		});
};

down = function () {
	return when.all([
			knex.Schema.dropTableIfExists("posts_search"),
		])
};

exports.up = up;
exports.down = down;