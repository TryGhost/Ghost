// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const converter = require('../lib/converter');

describe('Converter test', function () {
    describe('Minimal examples', function () {
        it('Can convert <p>Hello World</p>', function () {
            const mobiledoc = converter.toMobiledoc('<p>Hello World!</p>');

            mobiledoc.should.be.an.Object().with.properties(['version', 'atoms', 'cards', 'markups', 'sections']);

            // Most of the object is empty
            mobiledoc.atoms.should.be.an.Array().with.lengthOf(0);
            mobiledoc.cards.should.be.an.Array().with.lengthOf(0);
            mobiledoc.markups.should.be.an.Array().with.lengthOf(0);

            // Only version & sections are populated
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(1);
            mobiledoc.sections[0].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello World!']]]);
        });

        it('Can convert <p>Hello</p><p>World</p>', function () {
            const mobiledoc = converter.toMobiledoc('<p>Hello</p><p>World</p>');

            mobiledoc.should.be.an.Object().with.properties(['version', 'atoms', 'cards', 'markups', 'sections']);

            // Most of the object is empty
            mobiledoc.atoms.should.be.an.Array().with.lengthOf(0);
            mobiledoc.cards.should.be.an.Array().with.lengthOf(0);
            mobiledoc.markups.should.be.an.Array().with.lengthOf(0);

            // Only version & sections are populated
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[1].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });
    });

    describe('Nested examples', function () {
        it('Can convert <div><p>Hello</p><p>World</p></div>', function () {
            const mobiledoc = converter.toMobiledoc('<div><p>Hello</p><p>World</p></div>', {plugins: []});

            mobiledoc.should.be.an.Object().with.properties(['version', 'atoms', 'cards', 'markups', 'sections']);

            // Most of the object is empty
            mobiledoc.atoms.should.be.an.Array().with.lengthOf(0);
            mobiledoc.cards.should.be.an.Array().with.lengthOf(0);
            mobiledoc.markups.should.be.an.Array().with.lengthOf(0);

            // Only version & sections are populated
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[1].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });

        it('Can convert <div><div><p>Hello</p><p>World</p></div></div>', function () {
            const mobiledoc = converter.toMobiledoc('<div><div><p>Hello</p><p>World</p></div></div>', {plugins: []});

            mobiledoc.should.be.an.Object().with.properties(['version', 'atoms', 'cards', 'markups', 'sections']);

            // Most of the object is empty
            mobiledoc.atoms.should.be.an.Array().with.lengthOf(0);
            mobiledoc.cards.should.be.an.Array().with.lengthOf(0);
            mobiledoc.markups.should.be.an.Array().with.lengthOf(0);

            // Only version & sections are populated
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[1].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });

        it('Can convert <div><section><p>Hello</p></section><div><p>World</p></div></div>', function () {
            const mobiledoc = converter.toMobiledoc('<div><section><p>Hello</p></section><div><p>World</p></div></div>', {plugins: []});

            mobiledoc.should.be.an.Object().with.properties(['version', 'atoms', 'cards', 'markups', 'sections']);

            // Most of the object is empty
            mobiledoc.atoms.should.be.an.Array().with.lengthOf(0);
            mobiledoc.cards.should.be.an.Array().with.lengthOf(0);
            mobiledoc.markups.should.be.an.Array().with.lengthOf(0);

            // Only version & sections are populated
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[1].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });

        it('Can convert <div><p>Hello</p><div><p>World</p></div></div>', function () {
            const mobiledoc = converter.toMobiledoc('<div><p>Hello</p><div><p>World</p></div></div>', {plugins: []});

            mobiledoc.should.be.an.Object().with.properties(['version', 'atoms', 'cards', 'markups', 'sections']);

            // Most of the object is empty
            mobiledoc.atoms.should.be.an.Array().with.lengthOf(0);
            mobiledoc.cards.should.be.an.Array().with.lengthOf(0);
            mobiledoc.markups.should.be.an.Array().with.lengthOf(0);

            // Only version & sections are populated
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[1].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });

        it('Can convert with whitespace', function () {
            const mobiledoc = converter
                .toMobiledoc(`
                    <div>
                    <p>Hello</p>
                    <ul>
                        <li>Big</li>
                    </ul>
                    <div>
                        <p>World</p>
                    </div>
                </div>
                `, {plugins: []});

            mobiledoc.should.be.an.Object().with.properties(['version', 'atoms', 'cards', 'markups', 'sections']);

            // Most of the object is empty
            mobiledoc.atoms.should.be.an.Array().with.lengthOf(0);
            mobiledoc.cards.should.be.an.Array().with.lengthOf(0);
            mobiledoc.markups.should.be.an.Array().with.lengthOf(0);

            // Only version & sections are populated
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[0].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[1].should.eql([3, 'ul', [[[0, [], 0, 'Big']]]]);
            mobiledoc.sections[2].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[2].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });
    });

    // Basic tests to ensure that we are successfully loading kg-parser-plugins
    describe('Default plugin examples', function () {
        it('Can convert <hr> into a card', function () {
            const mobiledoc = converter.toMobiledoc('<hr />');

            mobiledoc.cards.should.be.an.Array().with.lengthOf(1);
            mobiledoc.cards[0].should.be.an.Array().with.lengthOf(2);
            mobiledoc.cards[0].should.eql(['hr', {}]);
            mobiledoc.sections.should.be.an.Array().with.lengthOf(1);
            mobiledoc.sections[0].should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.eql([10, 0]);
        });

        // this is a special-case test to make sure that we're preserving the
        // first HTML comment when parsing html to DOM before the conversion
        it('can convert html card output back into html card', function () {
            const mobiledoc = converter.toMobiledoc('<!--kg-card-begin: html--><div><span>Custom HTML</span></div><!--kg-card-end: html-->');

            mobiledoc.cards.should.be.an.Array().with.lengthOf(1);
            mobiledoc.cards[0].should.be.an.Array().with.lengthOf(2);
            mobiledoc.cards[0].should.eql(['html', {html: '<div><span>Custom HTML</span></div>'}]);
            mobiledoc.sections.should.be.an.Array().with.lengthOf(1);
            mobiledoc.sections[0].should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.eql([10, 0]);
        });
    });
});
