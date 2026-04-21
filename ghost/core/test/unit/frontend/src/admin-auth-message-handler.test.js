const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE_PATH = path.join(
    __dirname,
    '../../../../core/frontend/src/admin-auth/message-handler.js'
);

const SITE_ORIGIN = 'https://site.example.com';
const ADMIN_HREF = 'https://admin.example.com/ghost/auth-frame/';
const VALID_ID = 'a'.repeat(24);

function loadHandler(fetchStub) {
    const source = fs
        .readFileSync(SOURCE_PATH, 'utf8')
        .replace('{{SITE_ORIGIN}}', SITE_ORIGIN);

    let captured = null;
    const context = {
        window: {
            location: {href: ADMIN_HREF},
            addEventListener(_event, fn) {
                captured = fn;
            }
        },
        fetch: fetchStub,
        URLSearchParams
    };

    vm.createContext(context);
    vm.runInContext(source, context);

    assert.ok(captured, 'message listener was not registered');
    return captured;
}

function buildEvent(data) {
    const responses = [];
    const event = {
        origin: SITE_ORIGIN,
        data: JSON.stringify(data),
        source: {
            postMessage(payload) {
                responses.push(JSON.parse(payload));
            }
        }
    };
    return {event, responses};
}

async function dispatch(data) {
    const calls = [];
    const fetchStub = async (url, opts) => {
        calls.push({url, opts});
        return {json: async () => ({ok: true})};
    };
    const listener = loadHandler(fetchStub);
    const {event, responses} = buildEvent(data);
    await listener(event);
    return {calls, responses};
}

const INVALID_IDS = [
    {label: 'relative-path segment', value: '../../users/me/token'},
    {label: 'non-hex characters', value: 'ghijghijghijghijghijghij'},
    {label: 'wrong length', value: 'a'.repeat(23)},
    {label: 'non-string', value: undefined}
];

const ACTION_CASES = [
    {action: 'browseComments', idField: 'postId', expectedPath: `/comments/post/${VALID_ID}/`},
    {action: 'getReplies', idField: 'commentId', expectedPath: `/comments/${VALID_ID}/replies/`},
    {action: 'readComment', idField: 'commentId', expectedPath: `/comments/${VALID_ID}/`},
    {action: 'hideComment', idField: 'id', expectedPath: `/comments/${VALID_ID}/`, expectedMethod: 'PUT'},
    {action: 'showComment', idField: 'id', expectedPath: `/comments/${VALID_ID}/`, expectedMethod: 'PUT'}
];

describe('admin-auth message-handler', function () {
    describe('origin check', function () {
        it('ignores messages from unexpected origins', async function () {
            const listener = loadHandler(async () => assert.fail('fetch should not be called'));
            await listener({
                origin: 'https://attacker.example.com',
                data: JSON.stringify({action: 'browseComments', postId: VALID_ID}),
                source: {
                    postMessage() {
                        assert.fail('postMessage should not be called');
                    }
                }
            });
        });
    });

    for (const testCase of ACTION_CASES) {
        describe(`action ${testCase.action}`, function () {
            it('dispatches a request when the identifier is a valid ObjectID', async function () {
                const {calls, responses} = await dispatch({
                    uid: 'ok',
                    action: testCase.action,
                    [testCase.idField]: VALID_ID
                });

                assert.equal(calls.length, 1, 'fetch should be called once');
                assert.ok(
                    calls[0].url.includes(testCase.expectedPath),
                    `expected URL to contain ${testCase.expectedPath}, got ${calls[0].url}`
                );
                if (testCase.expectedMethod) {
                    assert.equal(calls[0].opts.method, testCase.expectedMethod);
                }
                assert.equal(responses.length, 1);
                assert.equal(responses[0].uid, 'ok');
                assert.equal(responses[0].error, null);
            });

            for (const bad of INVALID_IDS) {
                it(`rejects ${bad.label} without calling fetch`, async function () {
                    const {calls, responses} = await dispatch({
                        uid: 'bad',
                        action: testCase.action,
                        [testCase.idField]: bad.value
                    });

                    assert.equal(calls.length, 0, 'fetch must not be called');
                    assert.equal(responses.length, 1);
                    assert.equal(responses[0].uid, 'bad');
                    assert.equal(responses[0].error, 'Invalid identifier');
                    assert.equal(responses[0].result, null);
                });
            }
        });
    }

    describe('getUser', function () {
        it('still works (no identifier to validate)', async function () {
            const {calls, responses} = await dispatch({uid: 'u', action: 'getUser'});
            assert.equal(calls.length, 1);
            assert.ok(calls[0].url.includes('/users/me/'));
            assert.equal(responses[0].error, null);
        });
    });
});
