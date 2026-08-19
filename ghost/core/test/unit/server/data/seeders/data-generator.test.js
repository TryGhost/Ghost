const assert = require('node:assert/strict');

const knex = require('knex').default;

const importers = require('../../../../../core/server/data/seeders/importers');
const ProductsImporter = importers.find(i => i.table === 'products');
const OfferRedemptionsImporter = importers.find(i => i.table === 'offer_redemptions');
const StripeProductsImporter = importers.find(i => i.table === 'stripe_products');
const StripePricesImporter = importers.find(i => i.table === 'stripe_prices');
const AutomationsImporter = importers.find(i => i.table === 'automations');
const AutomationRunStepsImporter = importers.find(i => i.table === 'automation_run_steps');

const generateEvents = require('../../../../../core/server/data/seeders/utils/event-generator');
const {randomDateBetween} = require('../../../../../core/server/data/seeders/utils/random');

const DataGenerator = require('../../../../../core/server/data/seeders/data-generator');

const schema = require('../../../../../core/server/data/schema');

const schemaTables = schema.tables;

describe('Data Generator', function () {
    let db;

    beforeEach(async function () {
        db = knex({
            client: 'better-sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });

        for (const tableName of Object.keys(schema.tables)) {
            await db.schema.createTable(tableName, function (table) {
                for (const rowName of Object.keys(schema.tables[tableName])) {
                    const row = schema.tables[tableName][rowName];

                    if (rowName === '@@UNIQUE_CONSTRAINTS@@') {
                        for (const constraints of row) {
                            // A constraint is normally its columns; the object form names
                            // it, for when the derived name would overrun MySQL's limit.
                            if (constraints && typeof constraints === 'object' && !Array.isArray(constraints)) {
                                table.unique(constraints.columns, {indexName: constraints.indexName});
                            } else {
                                table.unique(constraints);
                            }
                        }
                        break;
                    } else if (rowName === '@@INDEXES@@') {
                        for (const indexes of row) {
                            // We ignore the index prefix for SQLite.
                            if (indexes && typeof indexes === 'object' && !Array.isArray(indexes)) {
                                table.index(indexes.columns);
                            } else {
                                table.index(indexes);
                            }
                        }
                        break;
                    } else if (rowName === '@@PRIMARY_KEY@@') {
                        table.primary(row);
                        break;
                    }

                    let rowChain = table[row.type.toLowerCase()](rowName);
                    if ('nullable' in row) {
                        if (row.nullable) {
                            rowChain = rowChain.nullable();
                        } else {
                            rowChain = rowChain.notNullable();
                        }
                    }
                    if ('defaultTo' in row) {
                        rowChain = rowChain.defaultTo(row.defaultTo);
                    }
                    if ('references' in row) {
                        const [foreignTable, foreignRow] = row.references.split('.');
                        rowChain = rowChain.references(foreignRow).inTable(foreignTable);
                    }
                    if (row.unique) {
                        table.unique([rowName]);
                    }
                    if (row.primary) {
                        table.primary(rowName);
                    }
                }
            });
        }

        await db('email_design_settings').insert({
            id: '000000000000000000000001',
            slug: 'default-automated-email',
            created_at: new Date()
        });
    });

    afterEach(async function () {
        await db.destroy();
    });

    it('Can import the whole dataset without error', async function () {
        const dataGenerator = new DataGenerator({
            knex: db,
            schema,
            schemaTables,
            logger: {
                info: () => { },
                ok: () => { },
                warn: () => { }
            },
            tables: [{
                name: 'members',
                quantity: 10
            }, {
                name: 'posts',
                quantity: 2
            }],
            withDefault: true
        });
        await dataGenerator.importData();
    });

    it('Can import automation actions and revisions', async function () {
        const dataGenerator = new DataGenerator({
            knex: db,
            schema,
            schemaTables,
            logger: {
                info: () => { },
                ok: () => { },
                warn: () => { }
            },
            tables: [{
                name: 'automations',
                quantity: 2
            }, {
                name: 'automation_actions',
                quantity: 8
            }, {
                name: 'automation_action_revisions',
                quantity: 16
            }, {
                name: 'automation_action_edges',
                quantity: 1
            }]
        });
        await dataGenerator.importData();

        const actions = await db.select('id', 'automation_id', 'created_at', 'type').from('automation_actions');
        const revisions = await db.select('action_id', 'wait_hours', 'email_subject', 'email_lexical', 'email_design_setting_id').from('automation_action_revisions');
        const edges = await db.select('source_action_id', 'target_action_id').from('automation_action_edges');

        assert.equal(actions.length, 8);
        assert.equal(revisions.length, 16);
        assert.equal(edges.length, 6);

        for (const action of actions) {
            const actionRevisions = revisions.filter(revision => revision.action_id === action.id);
            assert.equal(actionRevisions.length, 2);

            if (action.type === 'wait') {
                assert.ok(actionRevisions.every(revision => revision.wait_hours !== null));
                assert.ok(actionRevisions.every(revision => revision.wait_hours % 24 === 0));
                assert.ok(actionRevisions.every(revision => revision.email_subject === null));
                assert.ok(actionRevisions.every(revision => revision.email_lexical === null));
                assert.ok(actionRevisions.every(revision => revision.email_design_setting_id === null));
            } else {
                assert.ok(actionRevisions.every(revision => revision.wait_hours === null));
                assert.ok(actionRevisions.every(revision => revision.email_subject !== null));
                assert.ok(actionRevisions.every(revision => revision.email_lexical !== null));
                assert.ok(actionRevisions.every(revision => revision.email_design_setting_id === '000000000000000000000001'));
            }
        }

        const actionsByAutomation = Map.groupBy(actions, action => action.automation_id);
        const expectedEdges = [...actionsByAutomation.values()].flatMap((automationActions) => {
            const sortedActions = automationActions.toSorted((first, second) => {
                return first.created_at.localeCompare(second.created_at) || first.id.localeCompare(second.id);
            });
            return sortedActions.slice(1).map((action, index) => ({
                source_action_id: sortedActions[index].id,
                target_action_id: action.id
            }));
        });

        const bySourceAndTarget = (first, second) => {
            return first.source_action_id.localeCompare(second.source_action_id) || first.target_action_id.localeCompare(second.target_action_id);
        };
        assert.deepEqual(edges.toSorted(bySourceAndTarget), expectedEdges.toSorted(bySourceAndTarget));
    });

    it('Can import automation runs and run steps', async function () {
        const dataGenerator = new DataGenerator({
            knex: db,
            schema,
            schemaTables,
            logger: {
                info: () => { },
                ok: () => { },
                warn: () => { }
            },
            tables: [{
                name: 'automations',
                quantity: 2
            }, {
                name: 'members',
                quantity: 4
            }, {
                name: 'automation_actions',
                quantity: 8
            }, {
                name: 'automation_action_revisions',
                quantity: 16
            }, {
                name: 'automation_action_edges'
            }, {
                name: 'automation_runs',
                quantity: 6
            }, {
                name: 'automation_run_steps',
                quantity: 12
            }]
        });
        await dataGenerator.importData();

        const members = await db.select('id', 'email').from('members');
        const runs = await db.select('id', 'automation_id', 'member_id', 'member_email').from('automation_runs');
        const steps = await db.select('automation_run_id', 'automation_action_revision_id', 'status', 'step_attempts', 'started_at', 'finished_at').from('automation_run_steps');
        const revisions = await db.select('id', 'action_id', 'created_at').from('automation_action_revisions');
        const actions = await db.select('id', 'automation_id').from('automation_actions');
        const edges = await db.select('source_action_id', 'target_action_id').from('automation_action_edges');

        assert.equal(runs.length, 6);
        assert.ok(steps.length >= 12);

        const membersById = new Map(members.map(member => [member.id, member]));
        const actionsById = new Map(actions.map(action => [action.id, action]));
        const actionCountsByAutomation = new Map([...Map.groupBy(actions, action => action.automation_id)].map(([automationId, automationActions]) => [automationId, automationActions.length]));
        const revisionsById = new Map(revisions.map(revision => [revision.id, revision]));
        const latestRevisionIds = new Set([...Map.groupBy(revisions, revision => revision.action_id).values()].map((actionRevisions) => {
            return actionRevisions.toSorted((first, second) => second.created_at.localeCompare(first.created_at) || second.id.localeCompare(first.id))[0].id;
        }));
        const edgeKeys = new Set(edges.map(edge => `${edge.source_action_id}:${edge.target_action_id}`));

        for (const run of runs) {
            assert.equal(run.member_email, membersById.get(run.member_id).email);

            const runSteps = steps.filter(step => step.automation_run_id === run.id);
            assert.ok(runSteps.length > 0);
            assert.ok(runSteps.slice(0, -1).every(step => step.status === 'finished'));
            assert.ok(['pending', 'finished', 'failed'].includes(runSteps.at(-1).status));

            for (const step of runSteps) {
                if (step.status === 'pending') {
                    assert.equal(step.step_attempts, 0);
                    assert.equal(step.started_at, null);
                    assert.equal(step.finished_at, null);
                } else {
                    assert.equal(step.step_attempts, 1);
                    assert.notEqual(step.started_at, null);
                    assert.notEqual(step.finished_at, null);
                }
            }

            const stepActions = runSteps.map((step) => {
                assert.ok(latestRevisionIds.has(step.automation_action_revision_id));
                const revision = revisionsById.get(step.automation_action_revision_id);
                return actionsById.get(revision.action_id);
            });

            assert.ok(stepActions.every(action => action.automation_id === run.automation_id));
            assert.ok(edgeKeys.has(`${stepActions[0].id}:${stepActions[1].id}`));
        }

        for (const [automationId, actionCount] of actionCountsByAutomation) {
            const automationRuns = runs.filter(run => run.automation_id === automationId);
            assert.ok(automationRuns.some((run) => {
                return steps.filter(step => step.automation_run_id === run.id).length === actionCount;
            }));
        }

        await db('automation_run_steps').del();
        const transaction = await db.transaction();
        const runStepsImporter = new AutomationRunStepsImporter(db, transaction);
        await runStepsImporter.import(0);
        await transaction.commit();

        const minimumSteps = await db.select('automation_run_id').from('automation_run_steps');
        const fullPathExtraSteps = [...actionCountsByAutomation.values()].reduce((total, actionCount) => total + actionCount - 1, 0);
        assert.equal(minimumSteps.length, runs.length + fullPathExtraSteps);
        assert.equal(new Set(minimumSteps.map(step => step.automation_run_id)).size, runs.length);
    });

    it('Can import explicit offer redemptions', async function () {
        const dataGenerator = new DataGenerator({
            knex: db,
            schema,
            schemaTables,
            logger: {
                info: () => {},
                ok: () => {},
                warn: () => {}
            },
            tables: [{
                name: 'offers',
                quantity: 12
            }, {
                name: 'offer_redemptions',
                quantity: 10
            }],
            quantities: {
                members: 100,
                members_stripe_customers: 100,
                members_stripe_customers_subscriptions: 100
            }
        });

        await dataGenerator.importData();

        const offers = await db.select('name', 'code').from('offers');
        const redemptions = await db.select('offer_id', 'subscription_id').from('offer_redemptions');

        assert.equal(offers.length, 12);
        assert.equal(new Set(offers.map(offer => offer.name)).size, 12);
        assert.equal(new Set(offers.map(offer => offer.code)).size, 12);
        assert.equal(redemptions.length, 10);
        assert.equal(new Set(redemptions.map(redemption => `${redemption.subscription_id}:${redemption.offer_id}`)).size, 10);
    });
});

describe('Importer', function () {
    let db;

    beforeEach(async function () {
        db = knex({
            client: 'better-sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });

        await db.schema.createTable('products', function (table) {
            table.string('id');
            table.string('name');
            table.string('slug');
            table.string('visibility');
            table.date('created_at');
            table.string('type');
            table.string('description');
            table.string('currency');
            table.integer('monthly_price');
            table.integer('yearly_price');
            table.string('monthly_price_id');
            table.string('yearly_price_id');
        });

        await db.schema.createTable('stripe_products', function (table) {
            table.string('id');
            table.string('product_id');
            table.string('stripe_product_id');
            table.date('created_at');
            table.date('updated_at');
        });

        await db.schema.createTable('stripe_prices', function (table) {
            table.string('id');
            table.string('stripe_price_id');
            table.string('stripe_product_id');
            table.boolean('active');
            table.string('nickname');
            table.string('currency');
            table.integer('amount');
            table.string('type');
            table.string('interval');
            table.string('description');
            table.date('created_at');
            table.date('updated_at');
        });

        await db.schema.createTable('automations', function (table) {
            table.string('id');
            table.string('status');
            table.string('name').unique();
            table.string('slug').unique();
            table.dateTime('created_at');
            table.dateTime('updated_at');
        });
    });

    afterEach(async function () {
        await db.destroy();
    });

    it('Should import a single item', async function () {
        const transaction = await db.transaction();
        const productsImporter = new ProductsImporter(db, transaction);
        await productsImporter.import();
        transaction.commit();

        const products = await db.select('id', 'name').from('products');

        assert.equal(products.length, 4);
        assert.equal(products[0].name, 'Free');
    });

    it('Should import an item for each entry in an array', async function () {
        const transaction = await db.transaction();
        const productsImporter = new ProductsImporter(db, transaction);
        await productsImporter.import();

        const stripeProductsImporter = new StripeProductsImporter(db, transaction);
        await stripeProductsImporter.import();
        transaction.commit();

        const results = await db.select('id').from('stripe_products');

        assert.equal(results.length, 4);
    });

    it('Should import automations', async function () {
        const transaction = await db.transaction();
        const automationsImporter = new AutomationsImporter(db, transaction);
        await automationsImporter.import(3);
        await transaction.commit();

        const automations = await db.select('id', 'status', 'name', 'slug').from('automations');

        assert.equal(automations.length, 3);
        assert.deepEqual(automations.slice(0, 2).map(({name, slug}) => ({name, slug})), [{
            name: 'Free member welcome flow',
            slug: 'member-welcome-email-free'
        }, {
            name: 'Paid member welcome flow',
            slug: 'member-welcome-email-paid'
        }]);
        assert.equal(new Set(automations.map(automation => automation.name)).size, 3);
        assert.equal(new Set(automations.map(automation => automation.slug)).size, 3);
        assert.ok(automations.every(automation => ['active', 'inactive'].includes(automation.status)));
    });

    it('Should update products to reference price ids', async function () {
        const transaction = await db.transaction();
        const productsImporter = new ProductsImporter(db, transaction);
        await productsImporter.import();

        const stripeProductsImporter = new StripeProductsImporter(db, transaction);
        await stripeProductsImporter.import();

        const stripePricesImporter = new StripePricesImporter(db, transaction);
        await stripePricesImporter.import();

        await productsImporter.finalise();
        await stripeProductsImporter.finalise();
        await stripePricesImporter.finalise();
        transaction.commit();

        const results = await db.select('id', 'name', 'monthly_price_id', 'yearly_price_id').from('products');

        assert.equal(results.length, 4);
        assert.equal(results[0].name, 'Free');
    });

    it('Clamps redemption timestamps to the subscription window', function () {
        const importer = new OfferRedemptionsImporter(db, null);
        const subscriptionState = {
            subscriptionCreatedAt: new Date('2024-01-01T00:00:00.000Z'),
            redemptionEndAt: new Date('2024-01-01T00:00:01.000Z'),
            lastRedeemedAt: new Date('2024-01-01T00:00:00.500Z')
        };
        const offer = {
            created_at: '2024-01-01T00:00:00.000Z'
        };

        importer.getCreatedAt(subscriptionState, offer);

        assert.equal(subscriptionState.lastRedeemedAt.valueOf(), subscriptionState.redemptionEndAt.valueOf());
    });
});

describe('Events Generator', function () {
    it('Returns the start date when a range is inverted', function () {
        const startDate = new Date('2026-03-26T11:50:00.000Z');
        const endDate = new Date('2026-03-26T10:00:00.000Z');

        assert.equal(randomDateBetween(startDate, endDate).toISOString(), startDate.toISOString());
    });

    it('Generates a set of timestamps which meet the criteria', function () {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);
        const endTime = new Date();
        const timestamps = generateEvents({
            shape: 'flat',
            total: 100,
            trend: 'positive',
            startTime,
            endTime
        });

        for (const timestamp of timestamps) {
            assert(timestamp.valueOf() <= endTime.valueOf());
            assert(timestamp.valueOf() >= startTime.valueOf());
        }
    });

    it('Works for a set of shapes', function () {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);
        const endTime = new Date();

        const options = {
            startTime,
            endTime,
            total: 100,
            trend: 'positive'
        };

        const shapes = ['linear', 'flat', 'ease-in', 'ease-out'];

        for (const shape of shapes) {
            generateEvents(Object.assign({}, options, {shape}));
        }
    });
});
