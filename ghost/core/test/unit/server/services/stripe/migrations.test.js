const assert = require('assert/strict');
const sinon = require('sinon');
const Migrations = require('../../../../../core/server/services/stripe/StripeMigrations');

describe('Migrations', function () {
    describe('updateStripeProductNamesFromDefaultProduct', function () {
        it('Does not run migration if api is not configured', async function () {
            const api = {
                getProduct: sinon.stub().resolves({
                    id: 'prod_123',
                    name: 'Bronze'
                }),
                _configured: false
            };
            const models = {
                Product: {
                    transaction: sinon.spy()
                }
            };

            const migrations = new Migrations({
                models,
                api
            });

            await migrations.execute();

            assert(
                models.Product.transaction.called === false,
                'Stripe should not call any of the populateProductsAndPrices method parts if api is not configured'
            );
        });

        it('Does not run migration if api is in test environment', async function () {
            const api = {
                getProduct: sinon.stub().resolves({
                    id: 'prod_123',
                    name: 'Bronze'
                }),
                _configured: true,
                testEnv: true
            };
            const models = {
                Product: {
                    transaction: sinon.spy()
                }
            };

            const migrations = new Migrations({
                models,
                api
            });

            await migrations.execute();

            assert(
                models.Product.transaction.called === false,
                'Stripe should not call any of the populateProductsAndPrices method parts if api is not configured'
            );
        });

        it('Does not update Stripe product if name is not "Default Product"', async function () {
            const api = {
                getProduct: sinon.stub().resolves({
                    id: 'prod_123',
                    name: 'Bronze'
                }),
                updateProduct: sinon.stub().resolves()
            };
            const models = {
                Product: {
                    transaction: fn => fn()
                },
                StripeProduct: {
                    findPage: sinon.stub().resolves({
                        data: [{
                            get(key) {
                                return key;
                            }
                        }],
                        meta: {}
                    })
                },
                Settings: {
                    findOne: sinon.stub().resolves({
                        key: 'title',
                        value: 'Site Title'
                    })
                }
            };
            const migrations = new Migrations({
                models,
                api
            });

            await migrations.updateStripeProductNamesFromDefaultProduct();

            assert(
                api.updateProduct.called === false,
                'Stripe product should not be updated if name is not "Default Product"'
            );
        });

        it('Updates the Stripe Product name if it is Default Product', async function () {
            const api = {
                getProduct: sinon.stub().resolves({
                    id: 'prod_123',
                    name: 'Default Product'
                }),
                updateProduct: sinon.stub().resolves()
            };
            const models = {
                Product: {
                    transaction: fn => fn()
                },
                StripeProduct: {
                    findPage: sinon.stub().resolves({
                        data: [{
                            get(key) {
                                return key;
                            }
                        }],
                        meta: {}
                    })
                },
                Settings: {
                    findOne: sinon.stub().resolves({
                        get(key) {
                            if (key === 'key') {
                                return 'title';
                            }
                            if (key === 'value') {
                                return 'Site Title';
                            }

                            return key;
                        }
                    })
                }
            };
            const migrations = new Migrations({
                models,
                api
            });

            await migrations.updateStripeProductNamesFromDefaultProduct();

            assert(
                api.updateProduct.calledOnce,
                'Stripe product should be updated if name is "Default Product"'
            );

            assert(
                api.updateProduct.calledWith('prod_123', {
                    name: 'Site Title'
                }),
                'Stripe product should have been updated with the site title as name'
            );
        });
    });
});
