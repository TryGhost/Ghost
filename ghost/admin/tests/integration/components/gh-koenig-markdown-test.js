/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import {editorRendered, testInput, testInputTimeout} from '../../helpers/editor-helpers';

describe('Integration: Component: gh-koenig', function () {
    setupComponentTest('gh-koenig', {
        integration: true
    });

    beforeEach(function () {
        this.set('value', {
            version: '0.3.1',
            atoms: [],
            markups: [],
            cards: [],
            sections: []});
    });

    describe('Makerable markdown support.', function() {
        it('plain text inputs (placebo)', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('abcdef', '<p>abcdef</p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        // bold
        it('** bolds at start of line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('**test**', '<p><strong>test</strong></p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('** bolds in a line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('123**test**', '<p>123<strong>test</strong></p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('__ bolds at start of line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('__test__', '<p><strong>test</strong></p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('__ bolds in a line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('__test__', '<p><strong>test</strong></p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        // italic
        it('* italicises at start of line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('*test*', '<p><em>test</em></p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('* italicises in a line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('123*test*', '<p>123<em>test</em></p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('_ italicises at start of line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('_test_', '<p><em>test</em></p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('_ italicises in a line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('123_test_', '<p>123<em>test</em></p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        // strikethrough
        it('~~ strikethroughs at start of line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('~~test~~', '<p><s>test</s></p>', expect);
                })
                .then(() => {
                    done();
                });
        });
        it('~~ strikethroughs in a line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('123~~test~~', '<p>123<s>test</s></p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        // links
        it('[]() creates a link at start of line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('[ghost](https://www.ghost.org/)', '<p><a href="https://www.ghost.org/">ghost</a></p>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('[]() creates a link in a line', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('123[ghost](https://www.ghost.org/)', '<p>123<a href="https://www.ghost.org/">ghost</a></p>', expect);
                })
                .then(() => {
                    done();
                });
        });
    });
    describe('Block markdown support', function () {

        // headings
        it('# creates an H1', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('# ', '<h1><br></h1>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('## creates an H2', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('## ', '<h2><br></h2>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('### creates an H3', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('### ', '<h3><br></h3>', expect);
                })
                .then(() => {
                    done();
                });
        });

        // lists
        it('* creates an UL', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('* ', '<ul><li><br></li></ul>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('- creates an UL', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('- ', '<ul><li><br></li></ul>', expect);
                })
                .then(() => {
                    done();
                });
        });

        it('1. creates an OL', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('1. ', '<ol><li><br></li></ol>', expect);
                })
                .then(() => {
                    done();
                });
        });

        // quote
        it('> creates an blockquote', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInput('> ', '<blockquote><br></blockquote>', expect);
                })
                .then(() => {
                    done();
                });
        });
    });

    describe('Card markdown support.', function () {
        it('![]() creates an image card', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInputTimeout('![image of something](https://unsplash.it/200/300/?random)');
                })
                .then((value) => {
                    expect(value).to.have.string('kg-card-image');
                    done();
                });
        });
        it('``` creates a markdown card.', function (done) {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                            }}`);

            editorRendered()
                .then(() => {
                    let {editor} = window;
                    editor.element.focus();
                    return testInputTimeout('```some code```');
                })
                .then((value) => {
                    expect(value).to.have.string('kg-card-markdown');
                    done();
                });
        });
    });
});
