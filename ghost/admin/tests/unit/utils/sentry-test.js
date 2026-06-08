import {beforeSend} from 'ghost-admin/utils/sentry';
import {describe, it} from 'mocha';
import {expect} from 'chai';

import * as emberErrors from 'ember-ajax/errors';
import sinon from 'sinon';

describe('Unit: Util: sentry', function () {
    let isAjaxErrorStub;
    describe('beforeSend', function () {
        before(function () {
            isAjaxErrorStub = sinon.stub(emberErrors, 'isAjaxError');
        });

        it('should return an event', () => {
            isAjaxErrorStub.returns(false);
            const event = {
                test: 'test'
            };
            const hint = {};

            const result = beforeSend(event, hint);
            expect(result).to.deep.equal(event);
        });

        it('does not send the event if it was shown to the user', () => {
            isAjaxErrorStub.returns(false);
            const event = {
                tags: {
                    shown_to_user: true
                }
            };
            const hint = {};

            const result = beforeSend(event, hint);
            expect(result).to.equal(null);
        });

        it('removes post and page ids from the error message', () => {
            isAjaxErrorStub.returns(false);
            const event = {
                exception: {
                    values: [
                        {
                            value: 'Something went wrong <post:123>'
                        }
                    ]
                }
            };
            const hint = {};

            const result = beforeSend(event, hint);
            expect(result.exception.values[0].value).to.equal('Something went wrong <post:ID>');
        });

        it('returns the original event if there is an error', () => {
            isAjaxErrorStub.throws(new Error('test'));

            const event = {
                test: 'test'
            };
            const hint = {};

            const result = beforeSend(event, hint);
            expect(result).to.deep.equal(event);
        });

        it('returns the event even if the ajax error is missing values', () => {
            isAjaxErrorStub.returns(true);

            const event = {
                exception: {
                    values: []
                }
            };
            const exception = {
                payload: {
                    errors: []
                }
            };
            const hint = {
                originalException: exception
            };

            const result = beforeSend(event, hint);
            expect(result).to.deep.equal(event);
        });

        it('removes ajax tags and context if it is not an ajax error', () => {
            isAjaxErrorStub.returns(false);

            const event = {
                tags: {
                    ajax_status: 'test status',
                    ajax_method: 'test method',
                    ajax_url: 'test url'
                },
                contexts: {
                    ajax: 'test context'
                }
            };
            const hint = {
                originalException: {
                    payload: {
                        errors: []
                    }
                }
            };

            const result = beforeSend(event, hint);
            expect(result.tags.ajax_status).to.equal(undefined);
            expect(result.tags.ajax_method).to.equal(undefined);
            expect(result.tags.ajax_url).to.equal(undefined);
            expect(result.contexts.ajax).to.equal(undefined);
        });

        it('skips reporting e.ghost.org requests', () => {
            const event = {
                request: {
                    url: 'https://e.ghost.org/pg/injest/i/v0/e/'
                }
            };
            const exception = {
                payload: {
                    errors: []
                }
            };
            const hint = {
                originalException: exception
            };

            const result = beforeSend(event, hint);
            expect(result).to.equal(null);
        });

        it('skips reporting plausible requests', () => {
            const event = {
                request: {
                    url: 'https://plausible.io/api/event'
                }
            };

            const result = beforeSend(event);
            expect(result).to.equal(null);
        });
    });
});
