const assert = require('node:assert/strict');
const validators = require('../../../../../../../core/server/api/endpoints/utils/validators');

describe('Unit: endpoints/utils/validators/input/automated_email_sequences', function () {
    const apiConfig = {
        docName: 'automated_email_sequences',
        method: 'edit'
    };

    function makeFrame(emails) {
        return {
            options: {},
            data: {
                automated_email_sequences: [{emails}]
            }
        };
    }

    function validEmail(overrides = {}) {
        return {
            delay_days: 0,
            subject: 'Welcome!',
            lexical: JSON.stringify({root: {children: []}}),
            sender_name: 'Ghost',
            sender_email: 'ghost@example.com',
            sender_reply_to: 'ghost@example.com',
            email_design_setting_id: 'abc123',
            ...overrides
        };
    }

    function assertValid(emails) {
        validators.input.automated_email_sequences.edit(apiConfig, makeFrame(emails));
    }

    function assertInvalid(emails) {
        assert.throws(
            () => validators.input.automated_email_sequences.edit(apiConfig, makeFrame(emails)),
            {errorType: 'ValidationError'}
        );
    }

    describe('edit', function () {
        it('accepts a valid single email', function () {
            assertValid([validEmail()]);
        });

        it('accepts a valid sequence of multiple emails', function () {
            assertValid([
                validEmail({delay_days: 0}),
                validEmail({delay_days: 3, subject: 'Follow-up'})
            ]);
        });

        it('accepts emails with an id for updates', function () {
            assertValid([validEmail({id: 'existing123'})]);
        });

        describe('wrapper structure', function () {
            it('rejects missing wrapper', function () {
                const frame = {options: {}, data: {}};
                assert.throws(
                    () => validators.input.automated_email_sequences.edit(apiConfig, frame),
                    {errorType: 'ValidationError'}
                );
            });

            it('rejects empty wrapper array', function () {
                const frame = {options: {}, data: {automated_email_sequences: []}};
                assert.throws(
                    () => validators.input.automated_email_sequences.edit(apiConfig, frame),
                    {errorType: 'ValidationError'}
                );
            });
        });

        describe('emails array', function () {
            it('rejects missing emails array', function () {
                const frame = {options: {}, data: {automated_email_sequences: [{}]}};
                assert.throws(
                    () => validators.input.automated_email_sequences.edit(apiConfig, frame),
                    {errorType: 'ValidationError'}
                );
            });

            it('rejects empty emails array', function () {
                assertInvalid([]);
            });

            it('rejects more than 10 emails', function () {
                const emails = Array.from({length: 11}, (_, i) => validEmail({delay_days: 1, subject: `Email ${i}`}));
                assertInvalid(emails);
            });

            it('accepts exactly 10 emails', function () {
                const emails = Array.from({length: 10}, (_, i) => validEmail({delay_days: 1, subject: `Email ${i}`}));
                assertValid(emails);
            });
        });

        describe('delay_days', function () {
            it('rejects missing delay_days', function () {
                const email = validEmail();
                delete email.delay_days;
                assertInvalid([email]);
            });

            it('rejects negative delay_days', function () {
                assertInvalid([validEmail({delay_days: -1})]);
            });

            it('rejects non-integer delay_days', function () {
                assertInvalid([validEmail({delay_days: 1.5})]);
            });

            it('rejects delay_days greater than 7', function () {
                assertInvalid([validEmail({delay_days: 8})]);
            });

            it('accepts delay_days of exactly 7', function () {
                assertValid([validEmail({delay_days: 7})]);
            });

            it('accepts zero delay_days for the first email', function () {
                assertValid([validEmail({delay_days: 0})]);
            });

            it('rejects zero delay_days for a non-first email', function () {
                assertInvalid([
                    validEmail({delay_days: 0}),
                    validEmail({delay_days: 0, subject: 'Second'})
                ]);
            });

            it('accepts non-zero delay_days for a non-first email', function () {
                assertValid([
                    validEmail({delay_days: 0}),
                    validEmail({delay_days: 1, subject: 'Second'})
                ]);
            });
        });

        describe('subject', function () {
            it('rejects missing subject', function () {
                const email = validEmail();
                delete email.subject;
                assertInvalid([email]);
            });

            it('rejects empty subject', function () {
                assertInvalid([validEmail({subject: ''})]);
            });

            it('rejects whitespace-only subject', function () {
                assertInvalid([validEmail({subject: '   '})]);
            });
        });

        describe('lexical', function () {
            it('rejects missing lexical', function () {
                const email = validEmail();
                delete email.lexical;
                assertInvalid([email]);
            });

            it('rejects invalid JSON in lexical', function () {
                assertInvalid([validEmail({lexical: 'not json'})]);
            });
        });

        describe('required sender fields', function () {
            it('rejects missing sender_name', function () {
                const email = validEmail();
                delete email.sender_name;
                assertInvalid([email]);
            });

            it('rejects missing sender_email', function () {
                const email = validEmail();
                delete email.sender_email;
                assertInvalid([email]);
            });

            it('rejects missing sender_reply_to', function () {
                const email = validEmail();
                delete email.sender_reply_to;
                assertInvalid([email]);
            });

            it('rejects missing email_design_setting_id', function () {
                const email = validEmail();
                delete email.email_design_setting_id;
                assertInvalid([email]);
            });

            it('rejects null sender_name', function () {
                assertInvalid([validEmail({sender_name: null})]);
            });

            it('rejects null sender_email', function () {
                assertInvalid([validEmail({sender_email: null})]);
            });

            it('rejects null sender_reply_to', function () {
                assertInvalid([validEmail({sender_reply_to: null})]);
            });

            it('rejects non-string sender_name', function () {
                assertInvalid([validEmail({sender_name: 123})]);
            });

            it('rejects non-string email_design_setting_id', function () {
                assertInvalid([validEmail({email_design_setting_id: null})]);
            });
        });

        describe('duplicate IDs', function () {
            it('rejects duplicate email IDs', function () {
                assertInvalid([
                    validEmail({id: 'same-id', delay_days: 0}),
                    validEmail({id: 'same-id', delay_days: 1})
                ]);
            });

            it('allows multiple emails without IDs', function () {
                assertValid([
                    validEmail({delay_days: 0}),
                    validEmail({delay_days: 1})
                ]);
            });
        });
    });
});
