const EmailRenderer = require('../lib/email-renderer');
const assert = require('assert');

describe('Email renderer', function () {
    describe('buildReplacementDefinitions', function () {
        const emailRenderer = new EmailRenderer({
            urlUtils: {
                urlFor: () => 'http://example.com'
            }
        });
        const newsletter = {
            get: () => '123'
        };
        const member = {
            id: '456',
            uuid: 'myuuid',
            name: 'Test User',
            email: 'test@example.com'
        };

        it('returns an empty list of replacemetns if none used', function () {
            const html = 'Hello world';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 0);
        });

        it('returns a replacement if it is used', function () {
            const html = 'Hello world %%{uuid}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{uuid\\}%%/g');
            assert.equal(replacements[0].id, 'uuid');
            assert.equal(replacements[0].getValue(member), 'myuuid');
        });

        it('returns a replacement only once if used multiple times', function () {
            const html = 'Hello world %%{uuid}%% And %%{uuid}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{uuid\\}%%/g');
            assert.equal(replacements[0].id, 'uuid');
            assert.equal(replacements[0].getValue(member), 'myuuid');
        });

        it('returns correct first name', function () {
            const html = 'Hello %%{first_name}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name\\}%%/g');
            assert.equal(replacements[0].id, 'first_name');
            assert.equal(replacements[0].getValue(member), 'Test');
        });

        it('supports fallback values', function () {
            const html = 'Hey %%{first_name, "there"}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name, "there"\\}%%/g');
            assert.equal(replacements[0].id, 'first_name_2');
            assert.equal(replacements[0].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[0].getValue({name: ''}), 'there');
        });

        it('supports combination of multiple fallback values', function () {
            const html = 'Hey %%{first_name, "there"}%%, %%{first_name, "member"}%% %%{first_name}%% %%{first_name, "there"}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 3);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name, "there"\\}%%/g');
            assert.equal(replacements[0].id, 'first_name_2');
            assert.equal(replacements[0].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[0].getValue({name: ''}), 'there');

            assert.equal(replacements[1].token.toString(), '/%%\\{first_name, "member"\\}%%/g');
            assert.equal(replacements[1].id, 'first_name_3');
            assert.equal(replacements[1].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[1].getValue({name: ''}), 'member');

            assert.equal(replacements[2].token.toString(), '/%%\\{first_name\\}%%/g');
            assert.equal(replacements[2].id, 'first_name');
            assert.equal(replacements[2].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[2].getValue({name: ''}), '');
        });
    });

    describe('getPost', function () {
        const emailRenderer = new EmailRenderer({
            urlUtils: {
                urlFor: () => 'http://example.com'
            }
        });

        it('returns a post with correct subject from meta', function () {
            let post = {
                related: () => {
                    return {
                        get: () => {
                            return 'Test Newsletter';
                        }
                    };
                },
                get: () => {
                    return 'Sample Newsletter';
                }
            };
            let response = emailRenderer.getSubject(post);
            response.should.equal('Test Newsletter');
        });

        it('returns a post with correct subject from title', function () {
            let post = {
                related: () => {
                    return {
                        get: () => {
                            return '';
                        }
                    };
                },
                get: () => {
                    return 'Sample Newsletter';
                }
            };
            let response = emailRenderer.getSubject(post);
            response.should.equal('Sample Newsletter');
        });
    });

    describe('getFromAddress', function () {
        let emailRenderer = new EmailRenderer({
            settingsCache: {
                get: (key) => {
                    if (key === 'title') {
                        return 'Test Blog';
                    }
                }
            },
            settingsHelpers: {
                getNoReplyAddress: () => {
                    return 'reply@example.com';
                }
            }
        });

        it('returns correct from address for newsletter', function () {
            let newsletter = {
                get: (key) => {
                    if (key === 'sender_email') {
                        return 'ghost@example.com';
                    }

                    if (key === 'sender_name') {
                        return 'Ghost';
                    }
                }
            };
            let response = emailRenderer.getFromAddress({}, newsletter);
            response.should.equal('"Ghost" <ghost@example.com>');

            newsletter = {
                get: (key) => {
                    if (key === 'sender_email') {
                        return '';
                    }

                    if (key === 'sender_name') {
                        return '';
                    }
                }
            };
            response = emailRenderer.getFromAddress({}, newsletter);
            response.should.equal('"Test Blog" <reply@example.com>');
        });
    });

    describe('getReplyToAddress', function () {
        let emailRenderer = new EmailRenderer({
            settingsCache: {
                get: (key) => {
                    if (key === 'title') {
                        return 'Test Blog';
                    }
                }
            },
            settingsHelpers: {
                getMembersSupportAddress: () => {
                    return 'support@example.com';
                }
            }
        });

        it('returns correct reply to address for newsletter', function () {
            let newsletter = {
                get: (key) => {
                    if (key === 'sender_email') {
                        return 'ghost@example.com';
                    }

                    if (key === 'sender_name') {
                        return 'Ghost';
                    }

                    if (key === 'sender_reply_to') {
                        return 'support';
                    }
                }
            };
            let response = emailRenderer.getReplyToAddress({}, newsletter);
            response.should.equal('support@example.com');
        });
    });

    describe('getSegments', function () {
        let emailRenderer = new EmailRenderer({
            renderers: {
                lexical: {
                    render: () => {
                        return '<p> Lexical Test</p>';
                    }
                },
                mobiledoc: {
                    render: () => {
                        return '<p> Mobiledoc Test</p>';
                    }
                }
            }
        });

        it('returns correct empty segment for post', function () {
            let post = {
                url: '',
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }
                }
            };
            let response = emailRenderer.getSegments(post);
            response.should.eql([null]);

            post = {
                url: '',
                get: (key) => {
                    if (key === 'mobiledoc') {
                        return '{}';
                    }
                }
            };
            response = emailRenderer.getSegments(post);
            response.should.eql([null]);
        });

        it('returns correct segments for post with members only card', function () {
            emailRenderer = new EmailRenderer({
                renderers: {
                    lexical: {
                        render: () => {
                            return '<p> Lexical Test <!--members-only--> members only section</p>';
                        }
                    }
                }
            });

            let post = {
                url: '',
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }
                }
            };
            let response = emailRenderer.getSegments(post);
            response.should.eql(['status:free', 'status:-free']);
        });

        it('returns correct segments for post with email card', function () {
            emailRenderer = new EmailRenderer({
                renderers: {
                    lexical: {
                        render: () => {
                            return '<html> <div> Lexical Test </div> <div data-gh-segment="status:-free"> members only section</div> </html>';
                        }
                    }
                }
            });

            let post = {
                url: '',
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }
                }
            };
            let response = emailRenderer.getSegments(post);
            response.should.eql(['status:-free']);
        });
    });

    describe('renderBody', function () {
        let renderedPost = '<p> Lexical Test</p>';
        let emailRenderer = new EmailRenderer({
            audienceFeedbackService: {
                buildLink: () => {
                    return new URL('http://example.com');
                }
            },
            urlUtils: {
                urlFor: () => {
                    return 'http://icon.example.com';
                }
            },
            settingsCache: {
                get: (key) => {
                    if (key === 'accent_color') {
                        return '#ffffff';
                    }
                    if (key === 'timezone') {
                        return 'Etc/UTC';
                    }
                    if (key === 'title') {
                        return 'Test Blog';
                    }
                    if (key === 'icon') {
                        return 'ICON';
                    }
                }
            },
            getPostUrl: () => {
                return 'http://example.com';
            },
            renderers: {
                lexical: {
                    render: () => {
                        return renderedPost;
                    }
                },
                mobiledoc: {
                    render: () => {
                        return '<p> Mobiledoc Test</p>';
                    }
                }
            }
        });

        it('returns correct empty segment for post', async function () {
            let post = {
                url: '',
                related: () => {
                    return null;
                },
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }

                    if (key === 'visibility') {
                        return 'public';
                    }

                    if (key === 'title') {
                        return 'Test Post';
                    }
                },
                getLazyRelation: () => {
                    return {
                        models: [{
                            get: (key) => {
                                if (key === 'name') {
                                    return 'Test Author';
                                }
                            }
                        }]
                    };
                }
            };
            let newsletter = {
                get: (key) => {
                    if (key === 'header_image') {
                        return null;
                    }

                    if (key === 'name') {
                        return 'Test Newsletter';
                    }

                    if (key === 'badge') {
                        return false;
                    }

                    if (key === 'feedback_enabled') {
                        return true;
                    }
                    return false;
                }
            };
            let segment = null;
            let options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            response.plaintext.should.containEql('Test Post');
            response.plaintext.should.containEql('Unsubscribe [%%{unsubscribe_url}%%]');
            response.plaintext.should.containEql('http://example.com');
            response.html.should.containEql('Test Post');
            response.html.should.containEql('Unsubscribe');
            response.html.should.containEql('http://example.com');
            response.replacements.length.should.eql(1);
            response.replacements.should.match([
                {
                    id: 'unsubscribe_url',
                    token: /%%\{unsubscribe_url\}%%/g
                }
            ]);
        });

        it('removes data-gh-segment and renders paywall', async function () {
            renderedPost = '<div> Lexical Test </div> <div data-gh-segment="status:-free"> members only section</div> some text for both <!--members-only--> finishing part only for members';
            let post = {
                url: '',
                related: () => {
                    return null;
                },
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }

                    if (key === 'visibility') {
                        return 'paid';
                    }

                    if (key === 'title') {
                        return 'Test Post';
                    }
                },
                getLazyRelation: () => {
                    return {
                        models: [{
                            get: (key) => {
                                if (key === 'name') {
                                    return 'Test Author';
                                }
                            }
                        }]
                    };
                }
            };
            let newsletter = {
                get: (key) => {
                    if (key === 'header_image') {
                        return null;
                    }

                    if (key === 'name') {
                        return 'Test Newsletter';
                    }

                    if (key === 'badge') {
                        return false;
                    }

                    if (key === 'feedback_enabled') {
                        return true;
                    }
                    return false;
                }
            };
            let options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                'status:free',
                options
            );

            response.plaintext.should.containEql('Test Post');
            response.plaintext.should.containEql('Unsubscribe [%%{unsubscribe_url}%%]');
            response.plaintext.should.containEql('http://example.com');
            response.html.should.containEql('Test Post');
            response.html.should.containEql('Unsubscribe');
            response.html.should.containEql('http://example.com');
            response.replacements.length.should.eql(1);
            response.replacements.should.match([
                {
                    id: 'unsubscribe_url',
                    token: /%%\{unsubscribe_url\}%%/g
                }
            ]);
            response.html.should.not.containEql('members only section');
            response.html.should.containEql('some text for both');
            response.html.should.not.containEql('finishing part only for members');
            response.html.should.containEql('Become a paid member of Test Blog to get access to all');

            let responsePaid = await emailRenderer.renderBody(
                post,
                newsletter,
                'status:-free',
                options
            );
            responsePaid.html.should.containEql('members only section');
            responsePaid.html.should.containEql('some text for both');
            responsePaid.html.should.containEql('finishing part only for members');
            responsePaid.html.should.not.containEql('Become a paid member of Test Blog to get access to all');
        });
    });
});
