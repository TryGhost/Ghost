import './utils/index.js';
import {htmlToMobiledoc} from '../src/converter.js';

describe('Converter test', function () {
    describe('Minimal examples', function () {
        it('Can convert <p>Hello World</p>', function () {
            const mobiledoc = htmlToMobiledoc('<p>Hello World!</p>');
            mobiledoc.should.be.an.Object().with.properties(['version', 'atoms', 'cards', 'markups', 'sections']);
            mobiledoc.atoms.should.be.an.Array().with.lengthOf(0);
            mobiledoc.cards.should.be.an.Array().with.lengthOf(0);
            mobiledoc.markups.should.be.an.Array().with.lengthOf(0);
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(1);
            mobiledoc.sections[0].should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello World!']]]);
        });

        it('Can convert <p>Hello</p><p>World</p>', function () {
            const mobiledoc = htmlToMobiledoc('<p>Hello</p><p>World</p>');
            mobiledoc.should.be.an.Object().with.properties(['version', 'atoms', 'cards', 'markups', 'sections']);
            mobiledoc.atoms.should.be.an.Array().with.lengthOf(0);
            mobiledoc.cards.should.be.an.Array().with.lengthOf(0);
            mobiledoc.markups.should.be.an.Array().with.lengthOf(0);
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });
    });

    describe('Nested examples', function () {
        it('Can convert <div><p>Hello</p><p>World</p></div>', function () {
            const mobiledoc = htmlToMobiledoc('<div><p>Hello</p><p>World</p></div>', {plugins: []});
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });

        it('Can convert <div><div><p>Hello</p><p>World</p></div></div>', function () {
            const mobiledoc = htmlToMobiledoc('<div><div><p>Hello</p><p>World</p></div></div>', {plugins: []});
            mobiledoc.sections.should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });

        it('Can convert <div><section><p>Hello</p></section><div><p>World</p></div></div>', function () {
            const mobiledoc = htmlToMobiledoc('<div><section><p>Hello</p></section><div><p>World</p></div></div>', {plugins: []});
            mobiledoc.sections.should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });

        it('Can convert <div><p>Hello</p><div><p>World</p></div></div>', function () {
            const mobiledoc = htmlToMobiledoc('<div><p>Hello</p><div><p>World</p></div></div>', {plugins: []});
            mobiledoc.sections.should.be.an.Array().with.lengthOf(2);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });

        it('Can convert with whitespace', function () {
            const mobiledoc = htmlToMobiledoc(`
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
            mobiledoc.version.should.eql('0.3.1');
            mobiledoc.sections.should.be.an.Array().with.lengthOf(3);
            mobiledoc.sections[0].should.eql([1, 'p', [[0, [], 0, 'Hello']]]);
            mobiledoc.sections[1].should.eql([3, 'ul', [[[0, [], 0, 'Big']]]]);
            mobiledoc.sections[2].should.eql([1, 'p', [[0, [], 0, 'World']]]);
        });

        it('Can convert headings and paragraphs inside list items', function () {
            const mobiledoc = htmlToMobiledoc(`
                    <ul>
                        <li>
                            <h2>Heading</h2>
                            <p>Paragraph</p>
                        </li>
                    </ul>
                `, {plugins: []});
            mobiledoc.should.deepEqual({
                atoms: [], cards: [], markups: [],
                sections: [[3, 'ul', [[[0, [], 0, '']]]], [1, 'h2', [[0, [], 0, 'Heading']]], [1, 'p', [[0, [], 0, 'Paragraph']]]],
                version: '0.3.1'
            });
        });
    });

    describe('Default plugin examples', function () {
        it('Can convert <hr> into a card', function () {
            const mobiledoc = htmlToMobiledoc('<hr />');
            mobiledoc.cards.should.be.an.Array().with.lengthOf(1);
            mobiledoc.cards[0].should.eql(['hr', {}]);
            mobiledoc.sections[0].should.eql([10, 0]);
        });

        it('can convert html card output back into html card', function () {
            const mobiledoc = htmlToMobiledoc('<!--kg-card-begin: html--><div><span>Custom HTML</span></div><!--kg-card-end: html-->');
            mobiledoc.cards.should.be.an.Array().with.lengthOf(1);
            mobiledoc.cards[0].should.eql(['html', {html: '<div><span>Custom HTML</span></div>'}]);
            mobiledoc.sections[0].should.eql([10, 0]);
        });
    });
});
