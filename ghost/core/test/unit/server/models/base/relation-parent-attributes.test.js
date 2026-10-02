const assert = require('node:assert/strict');
const sinon = require('sinon');

const models = require('../../../../../core/server/models');
const schema = require('../../../../../core/server/data/schema');

describe('Relation parent attributes', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('relation setup', function () {
    it('does not run the parent through format()', function () {
      const post = models.Post.forge({ id: 'post-1', created_at: new Date() });
      const format = sinon.spy(post, 'format');

      const tags = post.tags();

      assert.equal(format.callCount, 0);
      assert.equal(tags.relatedData.parentFk, 'post-1');
      // the parent's own format is restored once setup is done
      assert.equal(post.format, format);
    });

    it('leaves a prototype format() in place after setup', function () {
      const post = models.Post.forge({ id: 'post-1' });

      post.tags();

      assert.equal(Object.hasOwn(post, 'format'), false);
      assert.equal(post.format, models.Post.prototype.format);
    });

    it('resolves belongsTo foreign keys from the raw attributes', function () {
      const post = models.Post.forge({ id: 'post-1', newsletter_id: 'newsletter-1' });

      assert.equal(post.newsletter().relatedData.parentFk, 'newsletter-1');
    });

    it('resolves morphTo targets from the raw attributes', function () {
      const action = models.Action.forge({
        id: 'action-1',
        actor_type: 'user',
        actor_id: 'user-1',
      });
      const actor = action.actor();

      assert.equal(actor.relatedData.targetTableName, 'users');
      assert.equal(actor.relatedData.parentFk, 'user-1');
    });

    it('restores the parent format() when setup throws', function () {
      const post = models.Post.forge({ id: 'post-1' });
      const format = sinon.spy(post, 'format');

      // morphTo with no matching candidate throws during init
      const action = models.Action.forge({ id: 'action-1', actor_type: 'nope', actor_id: 'x' });
      const actionFormat = sinon.spy(action, 'format');
      assert.throws(() => action.actor());
      assert.equal(action.format, actionFormat);

      post.tags();
      assert.equal(post.format, format);
    });
  });

  // Relation setup reads key columns from the unformatted attributes, which is
  // only correct while no model's format() renames or changes them.
  describe('format() leaves relation key columns alone', function () {
    const isKeyColumn = (column, table) => {
      if (column === 'id' || column.endsWith('_id')) {
        return true;
      }
      // morph keys pair a *_type column with a *_id column
      return column.endsWith('_type') && `${column.slice(0, -'_type'.length)}_id` in table;
    };

    const registered = Object.entries(models).filter(
      ([, Model]) =>
        typeof Model === 'function' &&
        Model.prototype?.tableName &&
        schema.tables[Model.prototype.tableName],
    );

    it('covers the registered models', function () {
      assert.ok(registered.length > 50, `expected the model registry, found ${registered.length}`);
    });

    for (const [name, Model] of registered) {
      it(name, function () {
        const table = schema.tables[Model.prototype.tableName];
        const keys = {};

        for (const column of Object.keys(table)) {
          if (isKeyColumn(column, table)) {
            keys[column] = `${column}-value`;
          }
        }

        const model = Model.forge();
        const formatted = model.format({ ...keys });

        for (const [column, value] of Object.entries(keys)) {
          assert.equal(formatted[column], value, `${name}.format() changed key column ${column}`);
        }
      });
    }
  });
});
