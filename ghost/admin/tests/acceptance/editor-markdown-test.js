/* jshint expr:true */
import {
    describe,
    it,
    beforeEach,
    afterEach
} from 'mocha';
import {expect} from 'chai';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';
import {editorRendered, testInput} from '../helpers/editor-helpers';
import {authenticateSession} from 'ghost-admin/tests/helpers/ember-simple-auth';

describe('Acceptance: Editor', function() {
    this.timeout(25000);
    let application;

    beforeEach(function() {
        application = startApp();
    });

    afterEach(function() {
        destroyApp(application);
    });

    describe('Markerable markdown support.', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});
            server.loadFixtures('settings');

            return authenticateSession(application);
        });

        it('the editor renders correctly', function () {
            server.createList('post', 1);

            visit('/editor/1');

            andThen(() => {
                expect(currentURL(), 'currentURL')
                    .to.equal('/editor/1');
                expect(find('.surface').prop('contenteditable'), 'editor is editable')
                    .to.equal('true');
                expect(window.editor)
                    .to.be.an('object');
            });
        });

        it('plain text inputs (placebo)', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('abcdef', '<p>abcdef</p>', expect);
            });
        });

        // bold
        it('** bolds at start of line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('**test**', '<p><strong>test</strong></p>', expect);
            });
        });

        it('** bolds in a line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('123**test**', '<p>123<strong>test</strong></p>', expect);
            });
        });

        it('__ bolds at start of line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('__test__', '<p><strong>test</strong></p>', expect);
            });
        });

        it('__ bolds in a line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('123__test__', '<p>123<strong>test</strong></p>', expect);
            });
        });

        // italic
        it('* italicises at start of line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('*test*', '<p><em>test</em></p>', expect);
            });
        });

        it('* italicises in a line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('123*test*', '<p>123<em>test</em></p>', expect);
            });
        });

        it('_ italicises at start of line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('_test_', '<p><em>test</em></p>', expect);
            });
        });

        it('_ italicises in a line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('123_test_', '<p>123<em>test</em></p>', expect);
            });
        });

        // strikethrough
        it('~~ strikethroughs at start of line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('~~test~~', '<p><s>test</s></p>', expect);
            });
        });

        it('~~ strikethroughs in a line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('123~~test~~', '<p>123<s>test</s></p>', expect);
            });
        });

        // links
        it('[]() creates a link at start of line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('[ghost](https://www.ghost.org/)', '<p><a href="https://www.ghost.org/">ghost</a></p>', expect);
            });
        });

        it('[]() creates a link in a line', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('123[ghost](https://www.ghost.org/)', '<p>123<a href="https://www.ghost.org/">ghost</a></p>', expect);
            });
        });
    });

    describe('Block markdown support.', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});
            server.loadFixtures('settings');

            return authenticateSession(application);
        });

        // headings
        it('# creates an H1', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('# ', '<h1><br></h1>', expect);
            });
        });
        it('## creates an H2', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('## ', '<h2><br></h2>', expect);
            });
        });

        it('### creates an H3', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('### ', '<h3><br></h3>', expect);
            });
        });

        // lists
        it('* creates an UL', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('* ', '<ul><li><br></li></ul>', expect);
            });
        });

        it('- creates an UL', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('- ', '<ul><li><br></li></ul>', expect);
            });
        });
        it('1. creates an OL', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('1. ', '<ol><li><br></li></ol>', expect);
            });
        });

        // quote
        it('> creates an blockquote', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('> ', '<blockquote><br></blockquote>', expect);
            });
        });
    });

    // card interactions and styling are still a WIP
    describe.skip('Card markdown support.', function () {
        beforeEach(function () {
            let role = server.create('role', {name: 'Administrator'});
            server.create('user', {roles: [role]});
            server.loadFixtures('settings');

            return authenticateSession(application);
        });

        it('![]() creates an image card.', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('![image of something](https://unsplash.it/200/300/?random) ', '...', expect);
            });
        });

        it('``` creates a markdown card.', function () {
            server.createList('post', 1);

            visit('/editor/1');
            andThen(() => {
                return editorRendered();
            });

            andThen(() => {
                return testInput('```some code``` ', '...', expect);
            });
        });
    });
});
