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
    const RELATION_CALL =
      /this\.(belongsTo|belongsToMany|hasMany|hasOne|morphTo|morphMany|morphOne)\(/;

    const registered = Object.entries(models).filter(
      ([, Model]) =>
        typeof Model === 'function' &&
        Model.prototype?.tableName &&
        schema.tables[Model.prototype.tableName],
    );

    // The parent-side columns each of the model's relations reads, taken from
    // the relations themselves rather than guessed from column names.
    const relationKeyColumns = (Model) => {
      const table = schema.tables[Model.prototype.tableName];
      const columns = new Set(['id']);
      const relationNames = new Set();

      for (
        let proto = Model.prototype;
        proto && proto !== Object.prototype;
        proto = Object.getPrototypeOf(proto)
      ) {
        for (const name of Object.getOwnPropertyNames(proto)) {
          const descriptor = Object.getOwnPropertyDescriptor(proto, name);
          if (
            typeof descriptor.value === 'function' &&
            RELATION_CALL.test(descriptor.value.toString())
          ) {
            relationNames.add(name);
          }
        }
      }

      for (const name of relationNames) {
        const model = Model.forge();
        // lets morphTo relations set up without resolving a target
        model._isEager = true;

        let relation;
        try {
          relation = model[name]();
        } catch {
          continue;
        }

        const data = relation?.relatedData;
        if (!data) {
          continue;
        }

        for (const key of [
          data.parentIdAttribute,
          data.foreignKey,
          data.otherKey,
          ...(data.columnNames || []),
        ]) {
          if (key && key in table) {
            columns.add(key);
          }
        }
      }

      return [...columns];
    };

    it('covers the registered models', function () {
      assert.ok(registered.length > 50, `expected the model registry, found ${registered.length}`);
    });

    it('finds keys that are not named *_id', function () {
      assert.ok(relationKeyColumns(models.Post).includes('published_by'));
      assert.ok(relationKeyColumns(models.Action).includes('actor_type'));
    });

    for (const [name, Model] of registered) {
      it(name, function () {
        const keys = Object.fromEntries(
          relationKeyColumns(Model).map((column) => [column, `${column}-value`]),
        );

        const formatted = Model.forge().format({ ...keys });

        for (const [column, value] of Object.entries(keys)) {
          assert.equal(formatted[column], value, `${name}.format() changed key column ${column}`);
        }
      });
    }
  });
});
