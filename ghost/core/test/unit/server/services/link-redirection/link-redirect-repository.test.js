const should = require('should');
const sinon = require('sinon');
const ObjectID = require('bson-objectid').default;
const EventEmitter = require('events').EventEmitter;

const LinkRedirectRepository = require('../../../../../core/server/services/link-redirection/LinkRedirectRepository');
const LinkRedirect = require('../../../../../core/server/services/link-redirection/LinkRedirect');

/**
 * Create a stubbed LinkRedirect Bookshelf model for testing, with overridable values
 *
 * @param {object} [values] - Values to override in the stubbed LinkRedirect model
 * @param {string} [values.id] - The ID of the model
 * @param {Date} [values.updated_at] - The updated_at date of the model
 * @param {Date} [values.created_at] - The created_at date of the model
 * @param {string} [values.from] - The from URL path of the model (path only)
 * @param {string} [values.to] - The to URL of the model (full URL including protocol, but not a URL object)
 * @returns {object} - A stubbed LinkRedirect Bookshelf model
 *
 */
function createRedirectModel(values = {}) {
    const get = sinon.stub();
    get.withArgs('updated_at').returns(values.updated_at || new Date('2022-10-20T00:00:10.000Z'));
    get.withArgs('created_at').returns(values.created_at || new Date('2022-10-20T00:00:00.000Z'));
    get.withArgs('from').returns(values.from || '/r/1234abcd');
    get.withArgs('to').returns(values.to || 'https://google.com');
    return {
        id: values.id || '662194931d0ba6fb37c080ee',
        get
    };
}

/**
 * Create a LinkRedirectRepository instance with stubbed dependencies
 * Optionally override dependencies with custom stubs if needed
 *
 * @param {object} deps
 * @param {object} [deps.LinkRedirect] - Stubbed LinkRedirect Bookshelf model
 * @param {object} [deps.urlUtils] - Stubbed URL Utils module
 * @param {object} [deps.cacheAdapter] - Stubbed cache adapter, or null is cache is disabled
 * @param {object} [deps.EventRegistry] - Stubbed EventRegistry
 * @returns {LinkRedirectRepository}
 */
function createLinkRedirectRepository(deps = {}) {
    const linkRows = [
        {id: '662194931d0ba6fb37c080ee'}
    ];
    const model = createRedirectModel();
    const models = {
        models: [model]
    };
    return new LinkRedirectRepository({
        LinkRedirect: deps.LinkRedirect || {
            findOne: sinon.stub().returns(model),
            findAll: sinon.stub().returns(models),
            getFilteredCollectionQuery: sinon.stub().returns({
                select: sinon.stub().returns({
                    distinct: sinon.stub().returns(linkRows)
                })
            }),
            add: sinon.stub().callsFake((data) => {
                return createRedirectModel(data);
            })
        },
        urlUtils: deps.urlUtils || {
            urlFor: sinon.stub().returns('https://example.com'),
            relativeToAbsolute: sinon.stub().returns(new URL('https://example.com')),
            absoluteToRelative: sinon.stub().returns('/r/1234abcd')
        },
        cacheAdapter: deps.cacheAdapter || null,
        EventRegistry: deps.EventRegistry || new EventEmitter()
    });
}

describe('UNIT: LinkRedirectRepository class', function () {
    let linkRedirectRepository;

    afterEach(function () {
        sinon.restore();
    });

    describe('fromModel', function () {
        it('should set edited to false if updated_at equals created_at', function () {
            const model = createRedirectModel({
                updated_at: new Date('2022-10-20T00:00:00.000Z'),
                created_at: new Date('2022-10-20T00:00:00.000Z')
            });
            linkRedirectRepository = createLinkRedirectRepository();
            const linkRedirect = linkRedirectRepository.fromModel(model);
            should(linkRedirect.from.href).equal('https://example.com/r/1234abcd');
            should(linkRedirect.to.href).equal('https://google.com/');
            should(linkRedirect.edited).be.false();
            should(ObjectID.isValid(linkRedirect.link_id)).be.true();
        });

        it('should set edited to false if updated_at is within 1 second of created_at', function () {
            const model = createRedirectModel({
                updated_at: new Date('2022-10-20T00:00:00.999Z'),
                created_at: new Date('2022-10-20T00:00:00.000Z')
            });
            linkRedirectRepository = createLinkRedirectRepository();
            const linkRedirect = linkRedirectRepository.fromModel(model);
            should(linkRedirect.from.href).equal('https://example.com/r/1234abcd');
            should(linkRedirect.to.href).equal('https://google.com/');
            should(linkRedirect.edited).be.false();
            should(ObjectID.isValid(linkRedirect.link_id)).be.true();
        });

        it('should set edited to true if updated_at is greater than created_at by more than 1 second', function () {
            const model = createRedirectModel({
                updated_at: new Date('2022-10-20T00:00:10.000Z'),
                created_at: new Date('2022-10-20T00:00:00.000Z')
            });
            linkRedirectRepository = createLinkRedirectRepository();
            const linkRedirect = linkRedirectRepository.fromModel(model);
            should(linkRedirect.from.href).equal('https://example.com/r/1234abcd');
            should(linkRedirect.to.href).equal('https://google.com/');
            should(linkRedirect.edited).be.true();
            should(ObjectID.isValid(linkRedirect.link_id)).be.true();
        });
    });

    describe('getAll', function () {
        it('should return an array of LinkRedirect instances', async function () {
            linkRedirectRepository = createLinkRedirectRepository();
            const linkRedirects = await linkRedirectRepository.getAll({});
            should(linkRedirects).be.an.Array();
            should(linkRedirects.length).equal(1);
            const linkRedirect = linkRedirects[0];
            should(linkRedirect.from.href).equal('https://example.com/r/1234abcd');
            should(linkRedirect.to.href).equal('https://google.com/');
            should(linkRedirect.edited).be.true();
            should(ObjectID.isValid(linkRedirect.link_id)).be.true();
        });
    });

    describe('getFilteredIds', function () {
        it('should return an array of link ids', async function () {
            linkRedirectRepository = createLinkRedirectRepository();
            const linkIds = await linkRedirectRepository.getFilteredIds({});
            should(linkIds).be.an.Array();
            should(linkIds.length).equal(1);
            should(linkIds[0]).equal('662194931d0ba6fb37c080ee');
        });
    });

    describe('getByURL', function () {
        it('should return a LinkRedirect instance', async function () {
            const url = new URL('https://example.com/r/1234abcd');
            linkRedirectRepository = createLinkRedirectRepository();
            const result = await linkRedirectRepository.getByURL(url);
            should(result).be.an.Object();
            should(result.from.href).equal(url.href);
            should(result.to.href).equal('https://google.com/');
        });

        it('should return a LinkRedirect instance from cache if enabled and key exists', async function () {
            const url = new URL('https://example.com/r/1234abcd');
            const cacheAdapterStub = {
                get: sinon.stub().returns({
                    link_id: '662194931d0ba6fb37c080ee',
                    from: 'https://example.com/r/1234abcd',
                    to: 'https://google.com',
                    edited: true
                }),
                reset: sinon.stub()
            };
            linkRedirectRepository = createLinkRedirectRepository({
                cacheAdapter: cacheAdapterStub
            });
            const result = await linkRedirectRepository.getByURL(url);
            should(result).be.an.Object();
            should(result.from.href).equal('https://example.com/r/1234abcd');
            should(result.to.href).equal('https://google.com/');
            should(result.edited).be.true();
            should(ObjectID.isValid(result.link_id)).be.true();
        });

        it('should return a LinkRedirect instance from the DB if cache is enabled and key does not exist', async function () {
            const url = new URL('https://example.com/r/1234abcd');
            const cacheAdapterStub = {
                get: sinon.stub().returns(null),
                set: sinon.stub(),
                reset: sinon.stub()
            };
            linkRedirectRepository = createLinkRedirectRepository({
                cacheAdapter: cacheAdapterStub
            });
            const result = await linkRedirectRepository.getByURL(url);
            should(result).be.an.Object();
            should(result.from.href).equal('https://example.com/r/1234abcd');
            should(result.to.href).equal('https://google.com/');
            should(result.edited).be.true();
            should(ObjectID.isValid(result.link_id)).be.true();
            should(cacheAdapterStub.set.calledOnce).be.true();
        });
    });

    describe('caching', function () {
        it('should add a new link redirect to the cache on save', async function () {
            const cacheAdapterStub = {
                set: sinon.stub()
            };
            linkRedirectRepository = createLinkRedirectRepository({
                cacheAdapter: cacheAdapterStub
            });

            const linkRedirect = new LinkRedirect({
                from: new URL('https://example.com/r/1234abcd'),
                to: new URL('https://google.com')
            });
            await linkRedirectRepository.save(linkRedirect);
            should(cacheAdapterStub.set.calledOnce).be.true();
        });

        it('should clear cache on site.changed event', function () {
            const reset = sinon.stub();
            const cacheAdapterStub = {
                reset: reset
            };
            const EventRegistry = new EventEmitter();
            linkRedirectRepository = createLinkRedirectRepository({
                cacheAdapter: cacheAdapterStub,
                EventRegistry
            });

            EventRegistry.emit('site.changed');
            should(reset.calledOnce).be.true();
        });
    });
});